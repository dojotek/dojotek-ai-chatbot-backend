import { Test, TestingModule } from '@nestjs/testing';
import { ChatAgentInferencesService } from './chat-agent-inferences.service';
import { LogsService } from '../logs/logs.service';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { ChatMessage } from '../generated/prisma/client';

// Mock the invoke method
const mockInvoke = jest.fn();

// Mock the entire @langchain/openai module
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockInvoke,
  })),
}));

describe('ChatAgentInferencesService', () => {
  let service: ChatAgentInferencesService;
  let logsService: jest.Mocked<LogsService>;
  let debugSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockLogsService = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      logSafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatAgentInferencesService,
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
      ],
    }).compile();

    service = module.get<ChatAgentInferencesService>(
      ChatAgentInferencesService,
    );
    logsService = module.get(LogsService);

    // Create spies to avoid unbound method issues
    debugSpy = jest.spyOn(logsService, 'debug');
    logSpy = jest.spyOn(logsService, 'log');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runChatAgent', () => {
    const mockSystemPrompt = 'You are a helpful assistant.';
    const mockResponse = {
      content: 'Hello! How can I help you today?',
      toString: () => 'Hello! How can I help you today?',
    };

    beforeEach(() => {
      mockInvoke.mockResolvedValue(mockResponse as any);
    });

    it('should create ChatOpenAI with gpt-4 model', async () => {
      await service.runChatAgent(mockSystemPrompt);

      expect(ChatOpenAI).toHaveBeenCalledWith({ model: 'gpt-4' });
    });

    it('should run chat agent with system prompt only', async () => {
      const result = await service.runChatAgent(mockSystemPrompt);

      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
      ]);
      expect(result).toBe('Hello! How can I help you today?');
    });

    it('should log debug message about message count', async () => {
      await service.runChatAgent(mockSystemPrompt);

      expect(debugSpy).toHaveBeenCalledWith(
        'Running chat agent with 1 messages (0 history messages)',
        'ChatAgentInferencesService',
      );
    });

    it('should log the LLM response', async () => {
      await service.runChatAgent(mockSystemPrompt);

      expect(logSpy).toHaveBeenCalledWith(
        'LLM response: Hello! How can I help you today?',
        'ChatAgentInferencesService',
      );
    });

    it('should handle user messages in recent history', async () => {
      const recentMessages: ChatMessage[] = [
        {
          id: '1',
          chatSessionId: 'session-1',
          messageType: 'user',
          content: 'Hello there!',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
      ];

      await service.runChatAgent(mockSystemPrompt, recentMessages);

      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
        new HumanMessage('Hello there!'),
      ]);
      expect(debugSpy).toHaveBeenCalledWith(
        'Running chat agent with 2 messages (1 history messages)',
        'ChatAgentInferencesService',
      );
    });

    it('should handle AI messages in recent history', async () => {
      const recentMessages: ChatMessage[] = [
        {
          id: '1',
          chatSessionId: 'session-1',
          messageType: 'ai',
          content: 'I am an AI assistant.',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
      ];

      await service.runChatAgent(mockSystemPrompt, recentMessages);

      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
        new AIMessage('I am an AI assistant.'),
      ]);
    });

    it('should handle mixed message types in recent history', async () => {
      const recentMessages: ChatMessage[] = [
        {
          id: '1',
          chatSessionId: 'session-1',
          messageType: 'user',
          content: 'What is AI?',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
        {
          id: '2',
          chatSessionId: 'session-1',
          messageType: 'ai',
          content: 'AI stands for Artificial Intelligence.',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
        {
          id: '3',
          chatSessionId: 'session-1',
          messageType: 'user',
          content: 'Tell me more.',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
      ];

      await service.runChatAgent(mockSystemPrompt, recentMessages);

      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
        new HumanMessage('What is AI?'),
        new AIMessage('AI stands for Artificial Intelligence.'),
        new HumanMessage('Tell me more.'),
      ]);
      expect(debugSpy).toHaveBeenCalledWith(
        'Running chat agent with 4 messages (3 history messages)',
        'ChatAgentInferencesService',
      );
    });

    it('should skip system messages in history to avoid conflicts', async () => {
      const recentMessages: ChatMessage[] = [
        {
          id: '1',
          chatSessionId: 'session-1',
          messageType: 'system',
          content: 'System message that should be skipped',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
        {
          id: '2',
          chatSessionId: 'session-1',
          messageType: 'user',
          content: 'Hello!',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
      ];

      await service.runChatAgent(mockSystemPrompt, recentMessages);

      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
        new HumanMessage('Hello!'),
      ]);
      expect(debugSpy).toHaveBeenCalledWith(
        'Running chat agent with 2 messages (2 history messages)',
        'ChatAgentInferencesService',
      );
    });

    it('should handle empty recent messages array', async () => {
      const recentMessages: ChatMessage[] = [];

      await service.runChatAgent(mockSystemPrompt, recentMessages);

      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
      ]);
      expect(debugSpy).toHaveBeenCalledWith(
        'Running chat agent with 1 messages (0 history messages)',
        'ChatAgentInferencesService',
      );
    });

    it('should handle undefined recent messages (default parameter)', async () => {
      await service.runChatAgent(mockSystemPrompt);

      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
      ]);
      expect(debugSpy).toHaveBeenCalledWith(
        'Running chat agent with 1 messages (0 history messages)',
        'ChatAgentInferencesService',
      );
    });

    it('should handle complex response content with toString method', async () => {
      const complexResponse = {
        content: {
          toString: () => 'Complex response content',
        },
      };
      mockInvoke.mockResolvedValue(complexResponse as any);

      const result = await service.runChatAgent(mockSystemPrompt);

      expect(result).toBe('Complex response content');
      expect(logSpy).toHaveBeenCalledWith(
        'LLM response: Complex response content',
        'ChatAgentInferencesService',
      );
    });

    it('should handle messages with unknown messageType gracefully', async () => {
      const recentMessages: ChatMessage[] = [
        {
          id: '1',
          chatSessionId: 'session-1',
          messageType: 'unknown' as 'user' | 'ai' | 'system',
          content: 'Unknown message type',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
        {
          id: '2',
          chatSessionId: 'session-1',
          messageType: 'user',
          content: 'Valid user message',
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        },
      ];

      await service.runChatAgent(mockSystemPrompt, recentMessages);

      // Should only include system message and valid user message
      expect(mockInvoke).toHaveBeenCalledWith([
        new SystemMessage(mockSystemPrompt),
        new HumanMessage('Valid user message'),
      ]);
    });

    it('should propagate errors from ChatOpenAI', async () => {
      const error = new Error('OpenAI API error');
      mockInvoke.mockRejectedValue(error);

      await expect(service.runChatAgent(mockSystemPrompt)).rejects.toThrow(
        'OpenAI API error',
      );
    });

    it('should handle empty system prompt', async () => {
      const emptySystemPrompt = '';

      await service.runChatAgent(emptySystemPrompt);

      expect(mockInvoke).toHaveBeenCalledWith([new SystemMessage('')]);
    });

    it('should handle large message history', async () => {
      const largeMessageHistory: ChatMessage[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `${i + 1}`,
          chatSessionId: 'session-1',
          messageType: i % 2 === 0 ? 'user' : 'ai',
          content: `Message ${i + 1}`,
          metadata: null,
          platformMessageId: null,
          createdAt: new Date(),
        }),
      );

      await service.runChatAgent(mockSystemPrompt, largeMessageHistory);

      expect(debugSpy).toHaveBeenCalledWith(
        'Running chat agent with 101 messages (100 history messages)',
        'ChatAgentInferencesService',
      );
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });
});
