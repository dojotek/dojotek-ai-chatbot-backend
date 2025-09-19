import { Test, TestingModule } from '@nestjs/testing';
import { BasicRagService } from './basic-rag.service';
import { VectorStorageFactoryService } from '../../vector-storage/vector-storage-factory.service';
import { LogsService } from '../../logs/logs.service';
import { ConfigsService } from '../../configs/configs.service';
import { AIMessage } from '@langchain/core/messages';

// Mock OpenAI client to avoid real network calls
jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => {
      return {
        bindTools: () => ({
          invoke: jest
            .fn()
            .mockResolvedValue(new AIMessage('mock tool-bound response')),
        }),
        invoke: jest.fn().mockResolvedValue(new AIMessage('mock llm response')),
      };
    }),
  };
});

describe('BasicRagService', () => {
  let service: BasicRagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigsService,
          useValue: {
            openaiApiKey: 'test',
          },
        },
        BasicRagService,
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

    service = module.get<BasicRagService>(BasicRagService);
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
