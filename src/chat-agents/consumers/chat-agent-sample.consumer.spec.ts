import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import {
  ChatAgentSampleConsumer,
  ProcessInboundMessageJobData,
} from './chat-agent-sample.consumer';
import { LogsService } from '../../logs/logs.service';
import { ChatAgentInferencesService } from '../chat-agent-inferences.service';
import { ChatAgentsService } from '../chat-agents.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ConfigsService } from '../../configs/configs.service';
import { MessageType } from '../../chat-messages/dto/create-chat-message.dto';

describe('ChatAgentSampleConsumer', () => {
  let consumer: ChatAgentSampleConsumer;
  let logsService: LogsService;
  let chatAgentInferencesService: ChatAgentInferencesService;
  let chatAgentsService: ChatAgentsService;
  let chatSessionsService: ChatSessionsService;
  let chatMessagesService: ChatMessagesService;
  let configsService: ConfigsService;

  const mockChatAgent = {
    id: 'chat-agent-1',
    customerId: 'customer-1',
    name: 'Test Chat Agent',
    description: 'A test chat agent',
    systemPrompt: 'You are a helpful assistant',
    config: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChatSession = {
    id: 'chat-session-1',
    chatAgentId: 'chat-agent-1',
    customerStaffId: 'staff-1',
    platform: 'slack',
    platformThreadId: 'slack-thread-123',
    sessionData: {},
    status: 'active',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessages = [
    {
      id: 'message-1',
      chatSessionId: 'chat-session-1',
      messageType: 'user',
      content: 'Hello',
      metadata: {},
      platformMessageId: 'slack-msg-1',
      createdAt: new Date('2023-01-01T10:00:00Z'),
    },
    {
      id: 'message-2',
      chatSessionId: 'chat-session-1',
      messageType: 'ai',
      content: 'Hi there!',
      metadata: {},
      platformMessageId: 'ai-msg-1',
      createdAt: new Date('2023-01-01T10:01:00Z'),
    },
  ];

  const mockJobData = {
    chatSessionId: 'chat-session-1',
    chatMessageId: 'message-3',
    chatAgentId: 'chat-agent-1',
    customerId: 'customer-1',
    customerStaffId: null,
    platform: 'slack',
    message: 'How are you?',
  };

  beforeEach(async () => {
    const mockLogsService = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    const mockChatAgentInferencesService = {
      runChatAgent: jest.fn(),
    };

    const mockChatAgentsService = {
      findOne: jest.fn(),
    };

    const mockChatSessionsService = {
      findOne: jest.fn(),
    };

    const mockChatMessagesService = {
      findMany: jest.fn(),
      create: jest.fn(),
    };

    const mockConfigsService = {
      getConfigWithDefault: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatAgentSampleConsumer,
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: ChatAgentInferencesService,
          useValue: mockChatAgentInferencesService,
        },
        {
          provide: ChatAgentsService,
          useValue: mockChatAgentsService,
        },
        {
          provide: ChatSessionsService,
          useValue: mockChatSessionsService,
        },
        {
          provide: ChatMessagesService,
          useValue: mockChatMessagesService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
      ],
    }).compile();

    consumer = module.get<ChatAgentSampleConsumer>(ChatAgentSampleConsumer);
    logsService = module.get(LogsService);
    chatAgentInferencesService = module.get(ChatAgentInferencesService);
    chatAgentsService = module.get(ChatAgentsService);
    chatSessionsService = module.get(ChatSessionsService);
    chatMessagesService = module.get(ChatMessagesService);
    configsService = module.get(ConfigsService);

    // Setup default mock implementations
    jest.spyOn(chatAgentsService, 'findOne').mockResolvedValue(mockChatAgent);
    jest
      .spyOn(chatSessionsService, 'findOne')
      .mockResolvedValue(mockChatSession);
    jest
      .spyOn(chatMessagesService, 'findMany')
      .mockResolvedValue([...mockMessages].reverse()); // Simulating desc order
    jest.spyOn(configsService, 'getConfigWithDefault').mockReturnValue(10);
    jest
      .spyOn(chatAgentInferencesService, 'runChatAgent')
      .mockResolvedValue('AI response');
    jest.spyOn(chatMessagesService, 'create').mockResolvedValue({
      id: 'ai-message-1',
      chatSessionId: 'chat-session-1',
      messageType: 'ai',
      content: 'AI response',
      metadata: {},
      platformMessageId: 'ai_slack_123456789_abcdef123',
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should process "process-inbound-message" job successfully', async () => {
      const job = {
        name: 'process-inbound-message',
        data: mockJobData,
      } as unknown as Job<ProcessInboundMessageJobData, any, string>;

      const result = (await consumer.process(job)) as string;

      expect(result).toBe('OK');
      expect(jest.spyOn(logsService, 'log')).toHaveBeenCalledWith(
        `Processing inbound message for session: ${mockJobData.chatSessionId}, agent: ${mockJobData.chatAgentId}`,
        'ChatAgentSampleConsumer',
      );
    });

    it('should handle unknown job name', async () => {
      const job = {
        name: 'unknown-job',
        data: mockJobData,
      } as unknown as Job<ProcessInboundMessageJobData, any, string>;

      const result = (await consumer.process(job)) as string;

      expect(result).toBe('OK');
      expect(jest.spyOn(logsService, 'log')).toHaveBeenCalledWith(
        'unknown job name: unknown-job',
        'ChatAgentSampleConsumer',
      );
    });
  });

  describe('processInboundMessage', () => {
    let job: Job<ProcessInboundMessageJobData, any, string>;

    beforeEach(() => {
      job = {
        name: 'process-inbound-message',
        data: mockJobData,
      } as unknown as Job<ProcessInboundMessageJobData, any, string>;
    });

    it('should successfully process inbound message', async () => {
      await consumer.process(job);

      // Verify chat agent retrieval
      expect(jest.spyOn(chatAgentsService, 'findOne')).toHaveBeenCalledWith({
        id: mockJobData.chatAgentId,
      });
      expect(jest.spyOn(logsService, 'debug')).toHaveBeenCalledWith(
        `Retrieved chat agent: ${mockChatAgent.name} with system prompt`,
        'ChatAgentSampleConsumer',
      );

      // Verify chat session retrieval
      expect(jest.spyOn(chatSessionsService, 'findOne')).toHaveBeenCalledWith({
        id: mockJobData.chatSessionId,
      });

      // Verify message history retrieval
      expect(
        jest.spyOn(configsService, 'getConfigWithDefault'),
      ).toHaveBeenCalledWith('CHAT_HISTORY_LIMIT', 10);
      expect(jest.spyOn(chatMessagesService, 'findMany')).toHaveBeenCalledWith({
        where: { chatSessionId: mockJobData.chatSessionId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Verify LLM inference
      expect(
        jest.spyOn(chatAgentInferencesService, 'runChatAgent'),
      ).toHaveBeenCalledWith(
        mockChatAgent.systemPrompt,
        mockMessages, // Should be in chronological order (oldest first)
      );

      // Verify AI message creation
      expect(jest.spyOn(chatMessagesService, 'create')).toHaveBeenCalledWith({
        chatSessionId: mockJobData.chatSessionId,
        messageType: MessageType.AI,
        content: 'AI response',
        platformMessageId: expect.stringMatching(
          /^ai_slack_\d+_[a-z0-9]{9}$/,
        ) as string,
      });

      expect(jest.spyOn(logsService, 'log')).toHaveBeenCalledWith(
        'Generated LLM response with length: 11',
        'ChatAgentSampleConsumer',
      );
    });

    it('should handle chat agent not found', async () => {
      jest.spyOn(chatAgentsService, 'findOne').mockResolvedValue(null);

      await consumer.process(job);

      expect(jest.spyOn(logsService, 'error')).toHaveBeenCalledWith(
        `Chat agent not found with ID: ${mockJobData.chatAgentId}`,
        'Chat agent retrieval failed',
        'ChatAgentSampleConsumer',
      );

      // Should not proceed with further processing
      expect(jest.spyOn(chatSessionsService, 'findOne')).not.toHaveBeenCalled();
      expect(
        jest.spyOn(chatMessagesService, 'findMany'),
      ).not.toHaveBeenCalled();
      expect(
        jest.spyOn(chatAgentInferencesService, 'runChatAgent'),
      ).not.toHaveBeenCalled();
      expect(jest.spyOn(chatMessagesService, 'create')).not.toHaveBeenCalled();
    });

    it('should handle chat session not found', async () => {
      jest.spyOn(chatSessionsService, 'findOne').mockResolvedValue(null);

      await consumer.process(job);

      expect(jest.spyOn(logsService, 'error')).toHaveBeenCalledWith(
        `Chat session not found with ID: ${mockJobData.chatSessionId}`,
        'Chat session retrieval failed',
        'ChatAgentSampleConsumer',
      );

      // Should not proceed with further processing
      expect(
        jest.spyOn(chatMessagesService, 'findMany'),
      ).not.toHaveBeenCalled();
      expect(
        jest.spyOn(chatAgentInferencesService, 'runChatAgent'),
      ).not.toHaveBeenCalled();
      expect(jest.spyOn(chatMessagesService, 'create')).not.toHaveBeenCalled();
    });

    it('should handle empty message history', async () => {
      jest.spyOn(chatMessagesService, 'findMany').mockResolvedValue([]);

      await consumer.process(job);

      expect(jest.spyOn(logsService, 'debug')).toHaveBeenCalledWith(
        'Retrieved 0 recent messages for context',
        'ChatAgentSampleConsumer',
      );

      expect(
        jest.spyOn(chatAgentInferencesService, 'runChatAgent'),
      ).toHaveBeenCalledWith(mockChatAgent.systemPrompt, []);
    });

    it('should use custom chat history limit from config', async () => {
      const customLimit = 20;
      jest
        .spyOn(configsService, 'getConfigWithDefault')
        .mockReturnValue(customLimit);

      await consumer.process(job);

      expect(jest.spyOn(chatMessagesService, 'findMany')).toHaveBeenCalledWith({
        where: { chatSessionId: mockJobData.chatSessionId },
        orderBy: { createdAt: 'desc' },
        take: customLimit,
      });
    });

    it('should handle error during chat agent inference', async () => {
      const inferenceError = new Error('LLM service unavailable');
      jest
        .spyOn(chatAgentInferencesService, 'runChatAgent')
        .mockRejectedValue(inferenceError);

      await expect(consumer.process(job)).rejects.toThrow(
        'LLM service unavailable',
      );

      expect(jest.spyOn(logsService, 'error')).toHaveBeenCalledWith(
        'Failed to process inbound message',
        expect.stringContaining('LLM service unavailable'),
        'ChatAgentSampleConsumer',
      );

      // Should not create AI message if inference fails
      expect(jest.spyOn(chatMessagesService, 'create')).not.toHaveBeenCalled();
    });

    it('should handle error during AI message creation', async () => {
      const createError = new Error('Database connection failed');
      jest.spyOn(chatMessagesService, 'create').mockRejectedValue(createError);

      await expect(consumer.process(job)).rejects.toThrow(
        'Database connection failed',
      );

      expect(jest.spyOn(logsService, 'error')).toHaveBeenCalledWith(
        'Failed to process inbound message',
        expect.stringContaining('Database connection failed'),
        'ChatAgentSampleConsumer',
      );
    });

    it('should handle error during chat agent retrieval', async () => {
      const retrievalError = new Error('Database timeout');
      jest
        .spyOn(chatAgentsService, 'findOne')
        .mockRejectedValue(retrievalError);

      await expect(consumer.process(job)).rejects.toThrow('Database timeout');

      expect(jest.spyOn(logsService, 'error')).toHaveBeenCalledWith(
        'Failed to process inbound message',
        expect.stringContaining('Database timeout'),
        'ChatAgentSampleConsumer',
      );
    });

    it('should handle non-Error objects in catch block', async () => {
      const nonErrorObject = 'String error';
      jest
        .spyOn(chatAgentsService, 'findOne')
        .mockRejectedValue(nonErrorObject);

      await expect(consumer.process(job)).rejects.toBe(nonErrorObject);

      expect(jest.spyOn(logsService, 'error')).toHaveBeenCalledWith(
        'Failed to process inbound message',
        'String error',
        'ChatAgentSampleConsumer',
      );
    });

    it('should generate unique platform message IDs', async () => {
      // Run the process multiple times
      await consumer.process(job);
      await consumer.process(job);

      expect(jest.spyOn(chatMessagesService, 'create')).toHaveBeenCalledTimes(
        2,
      );

      const calls = jest.spyOn(chatMessagesService, 'create').mock.calls;
      const firstPlatformMessageId = calls[0][0].platformMessageId;
      const secondPlatformMessageId = calls[1][0].platformMessageId;

      expect(firstPlatformMessageId).not.toBe(secondPlatformMessageId);
      expect(firstPlatformMessageId).toMatch(/^ai_slack_\d+_[a-z0-9]{9}$/);
      expect(secondPlatformMessageId).toMatch(/^ai_slack_\d+_[a-z0-9]{9}$/);
    });

    it('should reverse message history to chronological order', async () => {
      // Clear the default mock first
      jest.clearAllMocks();

      // Reset the other mocks needed for the flow
      jest.spyOn(chatAgentsService, 'findOne').mockResolvedValue(mockChatAgent);
      jest
        .spyOn(chatSessionsService, 'findOne')
        .mockResolvedValue(mockChatSession);
      jest.spyOn(configsService, 'getConfigWithDefault').mockReturnValue(10);
      jest
        .spyOn(chatAgentInferencesService, 'runChatAgent')
        .mockResolvedValue('AI response');
      jest.spyOn(chatMessagesService, 'create').mockResolvedValue({
        id: 'ai-message-1',
        chatSessionId: 'chat-session-1',
        messageType: 'ai',
        content: 'AI response',
        metadata: {},
        platformMessageId: 'ai_slack_123456789_abcdef123',
        createdAt: new Date(),
      });

      // The database returns messages in DESC order (newest first)
      const messagesInDescOrder = [
        {
          id: 'message-2',
          chatSessionId: 'chat-session-1',
          messageType: 'ai',
          content: 'Hi there!',
          metadata: {},
          platformMessageId: 'ai-msg-1',
          createdAt: new Date('2023-01-01T10:01:00Z'), // newer timestamp
        },
        {
          id: 'message-1',
          chatSessionId: 'chat-session-1',
          messageType: 'user',
          content: 'Hello',
          metadata: {},
          platformMessageId: 'slack-msg-1',
          createdAt: new Date('2023-01-01T10:00:00Z'), // older timestamp
        },
      ];

      jest
        .spyOn(chatMessagesService, 'findMany')
        .mockResolvedValue(messagesInDescOrder);

      await consumer.process(job);

      // The function receives messages in chronological order (oldest first)
      // Based on the test error, the received order is:
      // 1. "Hello" (older message, 10:00:00)
      // 2. "Hi there!" (newer message, 10:01:00)
      expect(
        jest.spyOn(chatAgentInferencesService, 'runChatAgent'),
      ).toHaveBeenCalledWith(mockChatAgent.systemPrompt, [
        {
          id: 'message-1',
          chatSessionId: 'chat-session-1',
          messageType: 'user',
          content: 'Hello',
          metadata: {},
          platformMessageId: 'slack-msg-1',
          createdAt: new Date('2023-01-01T10:00:00Z'),
        },
        {
          id: 'message-2',
          chatSessionId: 'chat-session-1',
          messageType: 'ai',
          content: 'Hi there!',
          metadata: {},
          platformMessageId: 'ai-msg-1',
          createdAt: new Date('2023-01-01T10:01:00Z'),
        },
      ]);
    });

    it('should log the correct LLM response length', async () => {
      const longResponse = 'A'.repeat(1000);
      jest
        .spyOn(chatAgentInferencesService, 'runChatAgent')
        .mockResolvedValue(longResponse);

      await consumer.process(job);

      expect(jest.spyOn(logsService, 'log')).toHaveBeenCalledWith(
        'Generated LLM response with length: 1000',
        'ChatAgentSampleConsumer',
      );
    });

    it('should handle job data with customerStaffId', async () => {
      const jobDataWithStaff = {
        ...mockJobData,
        customerStaffId: 'staff-123',
        customerId: null,
      };

      const jobWithStaff = {
        name: 'process-inbound-message',
        data: jobDataWithStaff,
      } as unknown as Job<ProcessInboundMessageJobData, any, string>;

      await consumer.process(jobWithStaff);

      expect(jest.spyOn(logsService, 'log')).toHaveBeenCalledWith(
        `Processing inbound message for session: ${jobDataWithStaff.chatSessionId}, agent: ${jobDataWithStaff.chatAgentId}`,
        'ChatAgentSampleConsumer',
      );

      // Verify the process completed successfully
      expect(jest.spyOn(chatMessagesService, 'create')).toHaveBeenCalled();
    });
  });
});
