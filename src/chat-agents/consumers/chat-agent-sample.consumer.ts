import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LogsService } from '../../logs/logs.service';
import { ChatAgentInferencesService } from '../chat-agent-inferences.service';
import { ChatAgentsService } from '../chat-agents.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { MessageType } from '../../chat-messages/dto/create-chat-message.dto';
import { ConfigsService } from '../../configs/configs.service';
import { ChatAgent } from '../entities/chat-agent.entity';
import { ChatSession } from '../../chat-sessions/entities/chat-session.entity';
import { ChatMessage } from '../../chat-messages/entities/chat-message.entity';

export interface ProcessInboundMessageJobData {
  chatSessionId: string;
  chatMessageId: string;
  chatAgentId: string;
  customerId: string | null;
  customerStaffId: string | null;
  platform: string;
  message: string;
}

@Processor('inbounds/sample')
export class ChatAgentSampleConsumer extends WorkerHost {
  constructor(
    private readonly logsService: LogsService,
    private readonly chatAgentInferencesService: ChatAgentInferencesService,
    private readonly chatAgentsService: ChatAgentsService,
    private readonly chatSessionsService: ChatSessionsService,
    private readonly chatMessagesService: ChatMessagesService,
    private readonly configsService: ConfigsService,
  ) {
    super();
  }

  async process(
    job: Job<ProcessInboundMessageJobData, any, string>,
  ): Promise<any> {
    switch (job.name) {
      case 'process-inbound-message':
        await this.processInboundMessage(job.data);
        break;
      default:
        this.logsService.log(
          `unknown job name: ${job.name}`,
          'ChatAgentSampleConsumer',
        );
    }

    return 'OK';
  }

  private async processInboundMessage(
    jobData: ProcessInboundMessageJobData,
  ): Promise<void> {
    const {
      chatSessionId,
      chatMessageId: _chatMessageId, // eslint-disable-line @typescript-eslint/no-unused-vars
      chatAgentId,
      customerId: _customerId, // eslint-disable-line @typescript-eslint/no-unused-vars
      customerStaffId: _customerStaffId, // eslint-disable-line @typescript-eslint/no-unused-vars
      platform,
      message: _message, // eslint-disable-line @typescript-eslint/no-unused-vars
    } = jobData;

    this.logsService.log(
      `Processing inbound message for session: ${chatSessionId}, agent: ${chatAgentId}`,
      'ChatAgentSampleConsumer',
    );

    try {
      // 1. Get chat agent using findOne to get systemPrompt
      const chatAgent: ChatAgent | null = await this.chatAgentsService.findOne({
        id: chatAgentId,
      });
      if (!chatAgent) {
        this.logsService.error(
          `Chat agent not found with ID: ${chatAgentId}`,
          'Chat agent retrieval failed',
          'ChatAgentSampleConsumer',
        );
        return;
      }

      this.logsService.debug(
        `Retrieved chat agent: ${chatAgent.name} with system prompt`,
        'ChatAgentSampleConsumer',
      );

      // 2. Get chat session using findOne
      const chatSession: ChatSession | null =
        await this.chatSessionsService.findOne({
          id: chatSessionId,
        });
      if (!chatSession) {
        this.logsService.error(
          `Chat session not found with ID: ${chatSessionId}`,
          'Chat session retrieval failed',
          'ChatAgentSampleConsumer',
        );
        return;
      }

      // 3. Get recent messages from chat session (K messages)
      const recentMessagesLimit = this.configsService.getConfigWithDefault(
        'CHAT_HISTORY_LIMIT',
        10,
      );
      const recentMessages: ChatMessage[] =
        await this.chatMessagesService.findMany({
          where: { chatSessionId },
          orderBy: { createdAt: 'desc' },
          take: recentMessagesLimit,
        });

      // Reverse the array to get chronological order (oldest first)
      const messageHistory = recentMessages.reverse();

      this.logsService.debug(
        `Retrieved ${messageHistory.length} recent messages for context`,
        'ChatAgentSampleConsumer',
      );

      // 4. Call runChatAgent with systemPrompt and recent messages
      const llmResponse = await this.chatAgentInferencesService.runChatAgent(
        chatAgent.systemPrompt,
        messageHistory,
      );

      this.logsService.log(
        `Generated LLM response with length: ${llmResponse.length}`,
        'ChatAgentSampleConsumer',
      );

      // 5. Create AI message with the LLM response
      const aiMessage: ChatMessage = await this.chatMessagesService.create({
        chatSessionId,
        messageType: MessageType.AI,
        content: llmResponse,
        platformMessageId: `ai_${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      this.logsService.log(
        `Created AI message with ID: ${aiMessage.id}`,
        'ChatAgentSampleConsumer',
      );
    } catch (error) {
      this.logsService.error(
        'Failed to process inbound message',
        error instanceof Error ? error.stack : String(error),
        'ChatAgentSampleConsumer',
      );
      throw error;
    }
  }
}
