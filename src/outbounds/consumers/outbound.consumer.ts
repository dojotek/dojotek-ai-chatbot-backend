import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LogsService } from '../../logs/logs.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { CustomerStaffIdentitiesService } from '../../customer-staff-identities/customer-staff-identities.service';
import { LarkOutboundService } from '../services/lark-outbound.service';

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

    // Only Lark for now; platform stored on chatSession
    if (chatSession.platform !== 'lark') {
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
        platform: 'lark',
        isActive: true,
      },
      take: 1,
      orderBy: { createdAt: 'desc' },
    });

    const customerIdentity = identity[0];
    if (!customerIdentity) {
      this.logs.error(
        'Customer staff identity not found for Lark',
        'Outbound send aborted',
        'OutboundConsumer',
      );
      return;
    }

    await this.larkOutbound.send({
      receiveIdType: 'open_id',
      receiveId: customerIdentity.platformUserId as unknown as string,
      msgType: 'text',
      content: chatMessage.content,
    });
  }
}
