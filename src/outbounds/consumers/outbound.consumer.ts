import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LogsService } from '../../logs/logs.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { CustomerStaffIdentitiesService } from '../../customer-staff-identities/customer-staff-identities.service';
import { LarkOutboundService } from '../services/lark-outbound.service';
import { SlackOutboundService } from '../services/slack-outbound.service';

export interface SendOutboundMessageJobData {
  chatMessageId: string;
}

@Processor('outbounds-from-chat-agents')
export class OutboundConsumer extends WorkerHost {
  constructor(
    private readonly logs: LogsService,
    private readonly chatMessages: ChatMessagesService,
    private readonly chatSessions: ChatSessionsService,
    private readonly customerStaffIdentities: CustomerStaffIdentitiesService,
    private readonly larkOutbound: LarkOutboundService,
    private readonly slackOutbound: SlackOutboundService,
  ) {
    super();
  }

  async process(
    job: Job<SendOutboundMessageJobData, any, string>,
  ): Promise<any> {
    switch (job.name) {
      case 'send-message':
        await this.handleSend(job.data);
        break;
      default:
        this.logs.log(`unknown job name: ${job.name}`, 'OutboundConsumer');
    }
    return 'OK';
  }

  private async handleSend(data: SendOutboundMessageJobData): Promise<void> {
    const { chatMessageId } = data;
    this.logs.debug(
      `Sending outbound for chatMessageId=${chatMessageId}`,
      'OutboundConsumer',
    );

    const chatMessage = await this.chatMessages.findOne({ id: chatMessageId });
    if (!chatMessage) {
      this.logs.error(
        `Chat message not found: ${chatMessageId}`,
        'Outbound send aborted',
        'OutboundConsumer',
      );
      return;
    }

    const chatSession = await this.chatSessions.findOne({
      id: chatMessage.chatSessionId,
    });
    if (!chatSession) {
      this.logs.error(
        `Chat session not found: ${chatMessage.chatSessionId}`,
        'Outbound send aborted',
        'OutboundConsumer',
      );
      return;
    }

    // Handle per-platform outbound
    if (chatSession.platform !== 'lark' && chatSession.platform !== 'slack') {
      this.logs.log(
        `Skipping outbound. Unsupported platform=${chatSession.platform}`,
        'OutboundConsumer',
      );
      return;
    }

    // Find customer staff identity by platform and staff id
    if (!chatSession.customerStaffId) {
      this.logs.error(
        'Missing customerStaffId on chat session',
        'Outbound send aborted',
        'OutboundConsumer',
      );
      return;
    }

    const identity = await this.customerStaffIdentities.findMany({
      where: {
        customerStaffId: chatSession.customerStaffId,
        platform: chatSession.platform,
        isActive: true,
      },
      take: 1,
      orderBy: { createdAt: 'desc' },
    });

    const customerIdentity = identity[0];
    if (!customerIdentity) {
      this.logs.error(
        `Customer staff identity not found for platform=${chatSession.platform}`,
        'Outbound send aborted',
        'OutboundConsumer',
      );
      return;
    }

    if (chatSession.platform === 'lark') {
      await this.larkOutbound.send({
        receiveIdType: 'open_id',
        receiveId: customerIdentity.platformUserId as unknown as string,
        msgType: 'text',
        content: chatMessage.content,
      });
      return;
    }

    if (chatSession.platform === 'slack') {
      const metadata = (chatMessage as any)?.metadata as  // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        | Record<string, unknown>
        | undefined;
      let channel =
        typeof metadata?.['channelId'] === 'string'
          ? metadata['channelId']
          : undefined;

      // Fallback: if current AI message does not have channelId, try previous message in the session
      if (!channel) {
        const previousMessages = await this.chatMessages.findMany({
          where: { chatSessionId: chatSession.id },
          orderBy: { createdAt: 'desc' },
          take: 2,
        });
        const previous = previousMessages.find((m) => m.id !== chatMessage.id);
        const prevMetadata = (previous as any)?.metadata as  // eslint-disable-line @typescript-eslint/no-unsafe-member-access
          | Record<string, unknown>
          | undefined;
        const prevChannel =
          typeof prevMetadata?.['channelId'] === 'string'
            ? prevMetadata['channelId']
            : undefined;
        if (prevChannel) {
          channel = prevChannel;
          this.logs.debug(
            `Recovered Slack channelId from previous message id=${previous?.id} for session=${chatSession.id}`,
            'OutboundConsumer',
          );
        }
      }

      if (!channel) {
        this.logs.error(
          'Missing Slack channelId in chatMessage.metadata and previous message; cannot send outbound',
          'Outbound send aborted',
          'OutboundConsumer',
        );
        return;
      }
      await this.slackOutbound.send({
        channel,
        text: chatMessage.content,
      });
      return;
    }
  }
}
