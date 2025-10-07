import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash, createDecipheriv } from 'crypto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigsService } from '../../configs/configs.service';
import { ChannelsService } from '../../channels/channels.service';
import { CustomerStaffIdentitiesService } from '../../customer-staff-identities/customer-staff-identities.service';
import { CustomerStaffsService } from '../../customer-staffs/customer-staffs.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { MessageType } from '../../chat-messages/dto/create-chat-message.dto';
import { ChatAgentsService } from '../../chat-agents/chat-agents.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LarkWebhookDto } from '../dto/lark-webhook.dto';

@Injectable()
export class LarkInboundService {
  private readonly logger = new Logger(LarkInboundService.name);

  // Narrowed types for Lark webhook payloads
  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
  }

  private getString(
    obj: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const val = obj[key];
    return typeof val === 'string' ? val : undefined;
  }

  private getNested(
    obj: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> | undefined {
    const val = obj[key];
    return this.isRecord(val) ? val : undefined;
  }

  private isLarkEventPayload(obj: unknown): obj is {
    header?: { event_type?: string; tenant_key?: string; token?: string };
    event?: {
      sender?: { sender_id?: { open_id?: string }; sender_type?: string };
      message?: {
        message_id?: string;
        create_time?: string;
        chat_id?: string;
        chat_type?: string;
        message_type?: string;
        content?: string;
      };
    };
  } {
    if (!this.isRecord(obj)) return false;
    const header = obj.header;
    const event = obj.event;
    return (
      (header === undefined || this.isRecord(header)) &&
      (event === undefined || this.isRecord(event))
    );
  }

  constructor(
    private readonly configs: ConfigsService,
    private readonly channelsService: ChannelsService,
    private readonly customerStaffIdentitiesService: CustomerStaffIdentitiesService,
    private readonly customerStaffsService: CustomerStaffsService,
    private readonly chatSessionsService: ChatSessionsService,
    private readonly chatMessagesService: ChatMessagesService,
    private readonly chatAgentsService: ChatAgentsService,
    @InjectQueue('inbounds-for-chat-agents') private queue: Queue,
  ) {}

  async handleEvent(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ) {
    // Handle url_verification shortcut if sent to webhook
    const typeValue =
      payload && this.isRecord(payload) && 'type' in payload
        ? payload.type
        : undefined;
    const type = typeof typeValue === 'string' ? typeValue : undefined;
    if (type === 'url_verification') {
      const maybeEvent = this.isRecord(payload) ? payload.event : undefined;
      const eventObj = this.isRecord(maybeEvent) ? maybeEvent : payload;
      return this.verify(eventObj);
    }

    // Decrypt if needed
    const normalized = this.normalizePayload(payload);

    // Validate normalized payload if it looks like an event delivery (has header/event)
    if (
      this.isLarkEventPayload(normalized) &&
      normalized.header &&
      normalized.event
    ) {
      const dto = plainToInstance(LarkWebhookDto, normalized);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length > 0) {
        this.logger.warn(
          `Invalid Lark payload: ${JSON.stringify(errors, null, 2)}`,
        );
        return { status: 'ignored' };
      }
    }

    // Validate token and signature
    this.validateSecurity(normalized, headers);

    const eventType = this.isLarkEventPayload(normalized)
      ? normalized.header?.event_type
      : undefined;
    if (!eventType) {
      return { status: 'ignored' };
    }

    // Process message receive
    if (eventType === 'im.message.receive_v1') {
      const tenantKey = this.isLarkEventPayload(normalized)
        ? normalized.header?.tenant_key
        : undefined;
      const openId = this.isLarkEventPayload(normalized)
        ? normalized.event?.sender?.sender_id?.open_id
        : undefined;
      const messageId = this.isLarkEventPayload(normalized)
        ? normalized.event?.message?.message_id
        : undefined;
      const chatId = this.isLarkEventPayload(normalized)
        ? normalized.event?.message?.chat_id
        : undefined;
      const chatType = this.isLarkEventPayload(normalized)
        ? normalized.event?.message?.chat_type
        : undefined;
      const messageType = this.isLarkEventPayload(normalized)
        ? normalized.event?.message?.message_type
        : undefined;
      let content: string | undefined = undefined;
      try {
        const rawContent = this.isLarkEventPayload(normalized)
          ? normalized.event?.message?.content
          : undefined;
        if (rawContent) {
          const parsed: unknown = JSON.parse(rawContent);
          const text = this.isRecord(parsed) ? parsed['text'] : undefined;
          content = typeof text === 'string' ? text : rawContent;
        }
      } catch {
        // fallback keep undefined
      }

      if (!tenantKey || !openId) {
        this.logger.error(
          `Missing tenantKey or openId. tenantKey=${tenantKey} openId=${openId}`,
        );
        return {};
      }

      // 1) Find channel by platform=lark and workspaceId=tenantKey
      const channels = await this.channelsService.findMany({
        where: { platform: 'lark', workspaceId: tenantKey },
        take: 1,
      });
      const channel = channels[0];
      if (!channel) {
        this.logger.error(
          `No channel found for platform=lark workspaceId=${tenantKey}. Silently ignoring.`,
        );
        return {};
      }

      // 2) Find or create customer staff identity by platform=lark, platformUserId=openId
      const existingIdentity =
        await this.customerStaffIdentitiesService.findMany({
          where: { platform: 'lark', platformUserId: openId },
          take: 1,
        });
      let customerStaffId: string;
      let customerId: string;
      if (existingIdentity[0]) {
        customerStaffId = existingIdentity[0].customerStaffId;
        // Fetch chat agent to get its customer
        const agent = await this.chatAgentsService.findOne({
          id: channel.chatAgentId,
        });
        if (!agent) {
          this.logger.error(`ChatAgent not found id=${channel.chatAgentId}`);
          return {};
        }
        customerId = agent.customerId;
      } else {
        // Get chat agent to determine customer to attach the staff to
        const agent = await this.chatAgentsService.findOne({
          id: channel.chatAgentId,
        });
        if (!agent) {
          this.logger.error(`ChatAgent not found id=${channel.chatAgentId}`);
          return {};
        }
        customerId = agent.customerId;

        // Create dummy customer staff
        const dummyName = `Lark User ${openId}`;
        const dummyEmail = `lark_${openId}@example.com`;
        const dummyPhone = `+000${openId.slice(-8)}`;
        const staff = await this.customerStaffsService.create({
          customerId,
          name: dummyName,
          email: dummyEmail,
          phone: dummyPhone,
          department: 'lark',
          position: 'member',
        });
        customerStaffId = staff.id;

        // Create identity mapping
        await this.customerStaffIdentitiesService.create({
          customerStaffId,
          platform: 'lark',
          platformUserId: openId,
          platformData: this.isLarkEventPayload(normalized)
            ? { senderType: normalized.event?.sender?.sender_type }
            : {},
          isActive: true,
        });
      }

      // 3) Ensure chat session exists and write message
      const sessionId = await this.chatSessionsService.getInboundChatSessionId(
        channel.chatAgentId,
        customerId,
        customerStaffId,
        'lark',
      );

      if (content) {
        const createdMessage = await this.chatMessagesService.create({
          chatSessionId: sessionId,
          messageType: MessageType.USER,
          content,
          metadata: {
            chatId,
            chatType,
            messageType,
          },
          platformMessageId: messageId,
        });

        // Enqueue processing job for the inbound message
        await this.queue.add('process-inbound-message', {
          chatSessionId: sessionId,
          chatMessageId: createdMessage.id,
          chatAgentId: channel.chatAgentId,
          customerId,
          customerStaffId,
          platform: 'lark',
          message: content,
          timestamp: new Date().toISOString(),
          service: 'lark-inbound',
        });
      }

      return {};
    }

    return {};
  }

  private verify(payload: Record<string, unknown>) {
    // Validate verification token first, then echo back challenge
    const configuredToken = this.configs.larkVerificationToken;
    const incomingToken = this.isRecord(payload)
      ? typeof payload.token === 'string'
        ? payload.token
        : undefined
      : undefined;
    if (configuredToken && incomingToken !== configuredToken) {
      throw new UnauthorizedException('Invalid verification token');
    }

    const challenge =
      this.isRecord(payload) && typeof payload.challenge === 'string'
        ? payload.challenge
        : null;
    if (typeof challenge === 'string') {
      return { challenge };
    }
    return { status: 'ignored' };
  }

  private normalizePayload(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const encryptKey = this.configs.larkEncryptKey;
    const encrypted =
      this.isRecord(payload) && typeof payload.encrypt === 'string'
        ? payload.encrypt
        : undefined;
    if (!encrypted) {
      return payload;
    }
    if (!encryptKey) {
      throw new UnauthorizedException(
        'Missing LARK_ENCRYPT_KEY for encrypted payload',
      );
    }
    const decrypted = this.decryptLark(encryptKey, encrypted);
    try {
      const obj: unknown = JSON.parse(decrypted);
      return this.isRecord(obj) ? obj : {};
    } catch {
      throw new UnauthorizedException('Failed to parse decrypted payload');
    }
  }

  private validateSecurity(
    normalized: unknown,
    headers: Record<string, string>,
  ): void {
    const verificationToken = this.configs.getConfigWithDefault(
      'LARK_VERIFICATION_TOKEN',
      '',
    );
    const headerToken = this.isLarkEventPayload(normalized)
      ? normalized.header?.token
      : undefined;
    if (verificationToken && headerToken !== verificationToken) {
      throw new UnauthorizedException('Invalid verification token');
    }

    const encryptKey = this.configs.larkEncryptKey;
    const timestamp =
      headers['x-lark-request-timestamp'] ||
      headers['X-Lark-Request-Timestamp'];
    const nonce =
      headers['x-lark-request-nonce'] || headers['X-Lark-Request-Nonce'];
    const signature =
      headers['x-lark-signature'] || headers['X-Lark-Signature'];
    if (timestamp && nonce && signature && encryptKey) {
      const bodyString = JSON.stringify(normalized ?? {});
      const computed = this.computeSignature(
        timestamp,
        nonce,
        encryptKey,
        bodyString,
      );
      if (computed !== signature) {
        throw new UnauthorizedException('Invalid signature');
      }
    }
  }

  private computeSignature(
    timestamp: string,
    nonce: string,
    encryptKey: string,
    body: string,
  ): string {
    const bytes = Buffer.concat([
      Buffer.from(`${timestamp}${nonce}${encryptKey}`, 'utf8'),
      Buffer.from(body, 'utf8'),
    ]);
    return createHash('sha256').update(bytes).digest('hex');
  }

  private decryptLark(key: string, encryptedBase64: string): string {
    // AES-CBC with iv=first block, PKCS7 padding; key is SHA256 of key string
    const ivAndCipher = Buffer.from(encryptedBase64, 'base64');
    const iv = ivAndCipher.subarray(0, 16);
    const cipherText = ivAndCipher.subarray(16);
    const hashedKey = createHash('sha256')
      .update(Buffer.from(key, 'utf8'))
      .digest();
    const decipher = createDecipheriv('aes-256-cbc', hashedKey, iv);
    const decrypted = Buffer.concat([
      decipher.update(cipherText),
      decipher.final(),
    ]);
    return this.pkcs7Unpad(decrypted).toString('utf8');
  }

  private pkcs7Unpad(data: Buffer): Buffer {
    const padLen = data[data.length - 1];
    return data.subarray(0, data.length - padLen);
  }
}
