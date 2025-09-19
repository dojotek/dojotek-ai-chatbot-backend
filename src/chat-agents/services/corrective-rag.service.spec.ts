import { Test, TestingModule } from '@nestjs/testing';
import { CorrectiveRagService } from './corrective-rag.service';
import { VectorStorageFactoryService } from '../../vector-storage/vector-storage-factory.service';
import { LogsService } from '../../logs/logs.service';

// Mock OpenAI client and LangChain hub to avoid real network calls
jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => {
      return {
        // Used in gradeDocuments via withStructuredOutput
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue({ binaryScore: 'yes' }),
        }),
        // Fallback invoke if called directly
        invoke: jest.fn().mockResolvedValue({ content: 'mock llm content' }),
      };
    }),
  };
});

jest.mock('langchain/hub', () => {
  return {
    pull: jest.fn().mockResolvedValue({
      // prompt.pipe(model)
      pipe: () => ({
        // .pipe(new StringOutputParser())
        pipe: () => ({
          // ragChain.invoke(...)
          invoke: jest.fn().mockResolvedValue('mock generated answer'),
        }),
      }),
    }),
  };
});

jest.mock('@langchain/core/prompts', () => {
  return {
    ChatPromptTemplate: {
      fromTemplate: jest.fn().mockReturnValue({
        // For usages like prompt.pipe(model) or prompt.pipe(llmWithTool)
        pipe: (runnable: unknown) => runnable,
      }),
    },
  };
});

describe('CorrectiveRagService', () => {
  let service: CorrectiveRagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorrectiveRagService,
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

    service = module.get<CorrectiveRagService>(CorrectiveRagService);
  });

  it('should return a string', async () => {
    const text = await service.runInference({
      knowledgeId: 'knowledge-123',
      knowledgeFileIds: ['k1'],
      recentMessages: [],
      userQuery: 'hello',
    });
    expect(typeof text).toBe('string');
  });
});
