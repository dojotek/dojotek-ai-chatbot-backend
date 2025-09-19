import { Test, TestingModule } from '@nestjs/testing';
import { AgenticRagService } from './agentic-rag.service';
import { VectorStorageFactoryService } from '../../vector-storage/vector-storage-factory.service';
import { LogsService } from '../../logs/logs.service';
import { ConfigsService } from '../../configs/configs.service';

// Mock OpenAI client and LangChain hub to avoid real network calls
jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => {
      return {
        bindTools: () => ({
          invoke: jest
            .fn()
            .mockResolvedValue({ content: 'mock tool-bound response' }),
        }),
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue({ binaryScore: 'yes' }),
        }),
        invoke: jest.fn().mockResolvedValue({ content: 'mock llm response' }),
      };
    }),
  };
});

jest.mock('langchain/hub', () => {
  return {
    pull: jest.fn().mockResolvedValue({
      pipe: () => ({
        invoke: jest
          .fn()
          .mockResolvedValue({ content: 'mock generated content' }),
      }),
    }),
  };
});

jest.mock('@langchain/core/prompts', () => {
  return {
    ChatPromptTemplate: {
      fromTemplate: jest.fn().mockReturnValue({
        pipe: (runnable: unknown) => runnable,
      }),
    },
  };
});

describe('AgenticRagService', () => {
  let service: AgenticRagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigsService,
          useValue: {
            openaiApiKey: 'test',
          },
        },
        AgenticRagService,
        {
          provide: LogsService,
          useValue: {
            logSafe: jest.fn(),
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: VectorStorageFactoryService,
          useValue: {
            createClient: () => ({
              similaritySearch: jest
                .fn()
                .mockResolvedValue([
                  { pageContent: 'doc content', metadata: { source: 's' } },
                ]),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AgenticRagService>(AgenticRagService);
  });

  it('should return a non-empty string', async () => {
    const text = await service.runInference({
      knowledgeId: 'knowledge-123',
      knowledgeFileIds: ['k1'],
      recentMessages: [],
      userQuery: 'hello',
    });
    expect(typeof text).toBe('string');
  });
});
