import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LogsService } from '../../logs/logs.service';
import { ChatAgentsService } from '../chat-agents.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { MessageType } from '../../chat-messages/dto/create-chat-message.dto';
import { ConfigsService } from '../../configs/configs.service';
import { ChatAgent } from '../entities/chat-agent.entity';
import { ChatSession } from '../../chat-sessions/entities/chat-session.entity';
import { ChatMessage } from '../../chat-messages/entities/chat-message.entity';
import { ChatAgentKnowledgesService } from '../../chat-agent-knowledges/chat-agent-knowledges.service';
import { KnowledgeFilesService } from '../../knowledge-files/knowledge-files.service';
import { BasicRagService } from '../services/basic-rag.service';
import { CorrectiveRagService } from '../services/corrective-rag.service';
import { SelfRagService } from '../services/self-rag.service';
import { AgenticRagService } from '../services/agentic-rag.service';

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
    private readonly chatAgentsService: ChatAgentsService,
    private readonly chatSessionsService: ChatSessionsService,
    private readonly chatMessagesService: ChatMessagesService,
    private readonly configsService: ConfigsService,
    private readonly chatAgentKnowledgesService: ChatAgentKnowledgesService,
    private readonly knowledgeFilesService: KnowledgeFilesService,

    private readonly basicRagService: BasicRagService,
    private readonly correctiveRagService: CorrectiveRagService,
    private readonly selfRagService: SelfRagService,
    private readonly agenticRagService: AgenticRagService,
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
      message: _message,
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

      // Remove the last message (current message) to avoid duplication with _message
      const messageHistory = recentMessages.slice(0, -1).reverse();

      this.logsService.debug(
        `Retrieved ${messageHistory.length} recent messages for context`,
        'ChatAgentSampleConsumer',
      );

      // 4. Collect active & processed knowledge file IDs for this agent
      const agentKnowledges =
        await this.chatAgentKnowledgesService.findByChatAgent(chatAgentId);
      const knowledgeIds = agentKnowledges
        .map((ak) => ak.knowledgeId)
        .filter(Boolean);

      const knowledgeFiles = await this.knowledgeFilesService.findMany({
        where: {
          knowledgeId: { in: knowledgeIds },
          status: 'processed',
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      const knowledgeFileIds = knowledgeFiles.map((kf) => kf.id);

      // 5. Prepare inputs and run RAG service (hard-coded: BasicRag)
      const recentMessagesForRag = messageHistory.map((m) => ({
        role:
          m.messageType === 'user'
            ? ('user' as const)
            : m.messageType === 'ai'
              ? ('ai' as const)
              : ('system' as const),
        content: m.content,
      }));

      const userQuery = _message;

      // Available RAG services: basicRagService, correctiveRagService, selfRagService, agenticRagService
      const llmResponse = await this.correctiveRagService.runInference({
        knowledgeId: knowledgeIds[0], // Use the first knowledge ID
        knowledgeFileIds,
        recentMessages: recentMessagesForRag,
        userQuery,
      });

      this.logsService.log(
        `Generated LLM response with length: ${llmResponse.length}`,
        'ChatAgentSampleConsumer',
      );

      // 6. Create AI message with the LLM response
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
