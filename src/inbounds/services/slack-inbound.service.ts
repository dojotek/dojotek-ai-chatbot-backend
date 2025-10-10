import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
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
import { SlackWebhookDto } from '../dto/slack-webhook.dto';

@Injectable()
export class SlackInboundService {
  private readonly logger = new Logger(SlackInboundService.name);

  // Narrowed types for Slack webhook payloads
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

  private isSlackEventPayload(obj: unknown): obj is {
    token?: string;
    team_id?: string;
    api_app_id?: string;
    event?: {
      type?: string;
      user?: string;
      text?: string;
      channel?: string;
      ts?: string;
      item?: {
        type?: string;
        channel?: string;
        ts?: string;
      };
      reaction?: string;
      item_user?: string;
      event_ts?: string;
    };
    type?: string;
    authed_users?: string[];
    authorizations?: Array<{
      enterprise_id?: string;
      team_id?: string;
      user_id?: string;
      is_bot?: boolean;
      is_enterprise_install?: boolean;
    }>;
    event_id?: string;
    event_context?: string;
    event_time?: number;
    context_team_id?: string;
    context_enterprise_id?: string | null;
    is_ext_shared_channel?: boolean;
  } {
    if (!this.isRecord(obj)) return false;
    const event = obj.event;
    return event === undefined || this.isRecord(event);
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
      return this.verify(payload);
    }

    // Validate token and signature (skip if url_verification which already returned)
    this.validateSecurity(payload, headers);

    const eventType = this.isSlackEventPayload(payload)
      ? payload.event?.type
      : undefined;
    if (!eventType) {
      return { status: 'ignored' };
    }

    // Only process message events
    if (eventType === 'message') {
      // Validate normalized payload only for message events, but do not block processing
      if (this.isSlackEventPayload(payload) && payload.event) {
        const dto = plainToInstance(SlackWebhookDto, payload);
        const errors = await validate(dto, {
          whitelist: true,
          forbidNonWhitelisted: true,
        });
        if (errors.length > 0) {
          this.logger.warn(
            `Invalid Slack payload: ${JSON.stringify(errors, null, 2)}`,
          );
        }
      }

      const teamId = this.isSlackEventPayload(payload)
        ? payload.team_id
        : undefined;
      const userId = this.isSlackEventPayload(payload)
        ? payload.event?.user
        : undefined;
      const channelId = this.isSlackEventPayload(payload)
        ? payload.event?.channel
        : undefined;
      const messageTs = this.isSlackEventPayload(payload)
        ? payload.event?.ts
        : undefined;
      const messageText = this.isSlackEventPayload(payload)
        ? payload.event?.text
        : undefined;

      if (!teamId || !userId) {
        this.logger.error(
          `Missing teamId or userId. teamId=${teamId} userId=${userId}`,
        );
        return {};
      }

      // 1) Find channel by platform=slack and workspaceId=teamId
      const channels = await this.channelsService.findMany({
        where: { platform: 'slack', workspaceId: teamId },
        take: 1,
      });
      const channel = channels[0];
      if (!channel) {
        this.logger.error(
          `No channel found for platform=slack workspaceId=${teamId}. Silently ignoring.`,
        );
        return {};
      }

      // 2) Find or create customer staff identity by platform=slack, platformUserId=userId
      const existingIdentity =
        await this.customerStaffIdentitiesService.findMany({
          where: { platform: 'slack', platformUserId: userId },
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
        const dummyName = `Slack User ${userId}`;
        const dummyEmail = `slack_${userId}@example.com`;
        const dummyPhone = `+000${userId.slice(-8)}`;
        const staff = await this.customerStaffsService.create({
          customerId,
          name: dummyName,
          email: dummyEmail,
          phone: dummyPhone,
          department: 'slack',
          position: 'member',
        });
        customerStaffId = staff.id;

        // Create identity mapping
        await this.customerStaffIdentitiesService.create({
          customerStaffId,
          platform: 'slack',
          platformUserId: userId,
          platformData: this.isSlackEventPayload(payload)
            ? {
                teamId: payload.team_id,
                apiAppId: payload.api_app_id,
                eventId: payload.event_id,
                eventContext: payload.event_context,
                eventTime: payload.event_time,
              }
            : {},
          isActive: true,
        });
      }

      // 3) Ensure chat session exists and write message
      const sessionId = await this.chatSessionsService.getInboundChatSessionId(
        channel.chatAgentId,
        customerId,
        customerStaffId,
        'slack',
      );

      const content = messageText ?? `Message from Slack user ${userId}`;

      const createdMessage = await this.chatMessagesService.create({
        chatSessionId: sessionId,
        messageType: MessageType.USER,
        content,
        metadata: {
          channelId,
          messageTs,
          eventType,
        },
        platformMessageId: messageTs,
      });

      // Enqueue processing job for the inbound message
      await this.queue.add('process-inbound-message', {
        chatSessionId: sessionId,
        chatMessageId: createdMessage.id,
        chatAgentId: channel.chatAgentId,
        customerId,
        customerStaffId,
        platform: 'slack',
        message: content,
        timestamp: new Date().toISOString(),
        service: 'slack-inbound',
      });
    }

    return {};
  }

  private verify(payload: Record<string, unknown>) {
    // Simply return the challenge from the incoming payload
    const challenge =
      this.isRecord(payload) && typeof payload.challenge === 'string'
        ? payload.challenge
        : null;
    if (typeof challenge === 'string') {
      return { challenge };
    }
    return { status: 'ignored' };
  }

  private validateSecurity(
    payload: unknown,
    headers: Record<string, string>,
  ): void {
    const signingSecret = this.configs.slackSigningSecret;
    const timestamp =
      headers['x-slack-request-timestamp'] ||
      headers['X-Slack-Request-Timestamp'];
    const signature =
      headers['x-slack-signature'] || headers['X-Slack-Signature'];

    if (timestamp && signature && signingSecret) {
      const bodyString = JSON.stringify(payload ?? {});
      const computed = this.computeSignature(
        timestamp,
        signingSecret,
        bodyString,
      );
      if (computed !== signature) {
        throw new UnauthorizedException('Invalid signature');
      }
    }
  }

  private computeSignature(
    timestamp: string,
    signingSecret: string,
    body: string,
  ): string {
    const sigBaseString = `v0:${timestamp}:${body}`;
    const signature = createHmac('sha256', signingSecret)
      .update(sigBaseString)
      .digest('hex');
    return `v0=${signature}`;
  }
}
