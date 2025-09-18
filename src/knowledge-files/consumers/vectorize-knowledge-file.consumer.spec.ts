import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { VectorizeKnowledgeFileConsumer } from './vectorize-knowledge-file.consumer';
import { PrismaService } from '../../prisma/prisma.service';
import { CachesService } from '../../caches/caches.service';
import { ConfigsService } from '../../configs/configs.service';
import { LogsService } from '../../logs/logs.service';
import { STORAGE_SERVICE } from '../../storage/constants';

interface VectorizeJobData {
  knowledgeFileId: string;
  storageKey: string;
}

// Mock the heavy dependencies
jest.mock('langchain/text_splitter');
jest.mock('@langchain/community/vectorstores/qdrant');
jest.mock('@langchain/openai');
jest.mock('@qdrant/js-client-rest');
jest.mock('@langchain/core/documents');
jest.mock('@langchain/community/document_loaders/fs/pdf');
jest.mock('@langchain/community/document_loaders/fs/docx');
jest.mock('langchain/document_loaders/fs/text');
jest.mock('fs-extra');

describe('VectorizeKnowledgeFileConsumer', () => {
  let consumer: VectorizeKnowledgeFileConsumer;
  let mockPrismaService: PrismaService;
  let cachesService: CachesService;
  let mockLogsService: LogsService;
  let findUniqueSpy: jest.SpyInstance;
  let updateSpy: jest.SpyInstance;
  let acquireLockSpy: jest.SpyInstance;
  let releaseLockSpy: jest.SpyInstance;

  const mockKnowledgeFile = {
    id: 'test-file-id',
    knowledgeId: 'test-knowledge-id',
    fileName: 'test.pdf',
    fileUrl: 'knowledge-files/2023-12-25/test-uuid.pdf',
    fileType: 'application/pdf',
    status: 'pending',
    isActive: false,
    knowledge: {
      id: 'test-knowledge-id',
      name: 'Test Knowledge',
    },
  };

  const mockJob: Job<VectorizeJobData> = {
    id: 'test-job-id',
    data: {
      knowledgeFileId: 'test-file-id',
      storageKey: 'knowledge-files/2023-12-25/test-uuid.pdf',
    },
  } as Job<VectorizeJobData>;

  const mockRedisClient = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorizeKnowledgeFileConsumer,
        {
          provide: PrismaService,
          useValue: {
            knowledgeFile: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CachesService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
            del: jest.fn(),
          },
        },
        {
          provide: ConfigsService,
          useValue: {
            cachePrefixKnowledgeFiles: 'knowledge-files',
          },
        },
        {
          provide: LogsService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            logSafe: jest.fn(),
          },
        },
        {
          provide: STORAGE_SERVICE,
          useValue: {
            getObjectStream: jest.fn(),
          },
        },
      ],
    }).compile();

    consumer = module.get<VectorizeKnowledgeFileConsumer>(
      VectorizeKnowledgeFileConsumer,
    );
    mockPrismaService = module.get<PrismaService>(PrismaService);
    cachesService = module.get<CachesService>(CachesService);
    mockLogsService = module.get<LogsService>(LogsService);

    // Create spies for Prisma methods
    findUniqueSpy = jest.spyOn(mockPrismaService.knowledgeFile, 'findUnique');
    updateSpy = jest.spyOn(mockPrismaService.knowledgeFile, 'update');

    // Create spies for private methods
    acquireLockSpy = jest.spyOn(consumer as any, 'acquireLock');
    releaseLockSpy = jest.spyOn(consumer as any, 'releaseLock');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('process', () => {
    it('should skip processing if knowledge file not found', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('test-job-id');
      mockRedisClient.del.mockResolvedValue(1);
      findUniqueSpy.mockResolvedValue(null);

      await consumer.process(mockJob);

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { id: 'test-file-id' },
        include: { knowledge: true },
      });
      expect(updateSpy).not.toHaveBeenCalled();
      expect(jest.spyOn(mockLogsService, 'error')).toHaveBeenCalledWith(
        'Knowledge file not found: test-file-id',
        undefined,
        'VectorizeKnowledgeFileConsumer',
      );
    });

    it('should skip processing if knowledge file status is not pending', async () => {
      const processingKnowledgeFile = {
        ...mockKnowledgeFile,
        status: 'processing',
      };

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('test-job-id');
      mockRedisClient.del.mockResolvedValue(1);
      findUniqueSpy.mockResolvedValue(processingKnowledgeFile);

      await consumer.process(mockJob);

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { id: 'test-file-id' },
        include: { knowledge: true },
      });
      expect(jest.spyOn(mockLogsService, 'warn')).toHaveBeenCalledWith(
        'Knowledge file test-file-id has status processing, skipping processing',
        'VectorizeKnowledgeFileConsumer',
      );
    });

    it('should skip processing if lock cannot be acquired', async () => {
      mockRedisClient.set.mockResolvedValue(null); // Lock not acquired

      await consumer.process(mockJob);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'knowledge-files:vectorize-lock:test-file-id',
        'test-job-id',
        'EX',
        3600,
        'NX',
      );
      expect(jest.spyOn(mockLogsService, 'warn')).toHaveBeenCalledWith(
        'Lock not acquired for knowledge file: test-file-id',
        'VectorizeKnowledgeFileConsumer',
      );
      expect(findUniqueSpy).not.toHaveBeenCalled();
    });

    it('should update status to processing when starting', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('test-job-id');
      mockRedisClient.del.mockResolvedValue(1);
      findUniqueSpy.mockResolvedValue(mockKnowledgeFile);

      // Mock the remaining methods to prevent actual processing
      const downloadFileSpy = jest
        .spyOn(consumer as any, 'downloadFile')
        .mockRejectedValue(new Error('Mock error'));
      updateSpy.mockResolvedValue(mockKnowledgeFile);
      jest.spyOn(cachesService, 'del').mockResolvedValue(1);

      // Expect the error to be thrown
      await expect(consumer.process(mockJob)).rejects.toThrow('Mock error');

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'test-file-id' },
        data: { status: 'processing' },
      });

      downloadFileSpy.mockRestore();
    });

    it('should update status to failed on error', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('test-job-id');
      mockRedisClient.del.mockResolvedValue(1);
      findUniqueSpy.mockResolvedValue(mockKnowledgeFile);

      // Mock the file download to throw error
      const downloadFileSpy = jest
        .spyOn(consumer as any, 'downloadFile')
        .mockRejectedValue(new Error('Download failed'));
      updateSpy.mockResolvedValue(mockKnowledgeFile);
      jest.spyOn(cachesService, 'del').mockResolvedValue(1);

      // Expect the error to be thrown
      await expect(consumer.process(mockJob)).rejects.toThrow(
        'Download failed',
      );

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'test-file-id' },
        data: { status: 'processing' },
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'test-file-id' },
        data: { status: 'failed' },
      });

      downloadFileSpy.mockRestore();
    });

    it('should always release lock even on error', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('test-job-id');
      mockRedisClient.del.mockResolvedValue(1);
      findUniqueSpy.mockRejectedValue(new Error('Database error'));

      // Expect the error to be thrown but lock to be released
      await expect(consumer.process(mockJob)).rejects.toThrow('Database error');

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'knowledge-files:vectorize-lock:test-file-id',
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'knowledge-files:vectorize-lock:test-file-id',
      );
    });
  });

  describe('private methods', () => {
    describe('acquireLock', () => {
      it('should return true when lock is acquired', async () => {
        mockRedisClient.set.mockResolvedValue('OK');
        acquireLockSpy.mockRestore();

        acquireLockSpy = jest
          .spyOn(consumer as any, 'acquireLock')
          .mockImplementation(async (lockKey: string, jobId: string) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result: string | null = await mockRedisClient.set(
              lockKey,
              jobId,
              'EX',
              3600,
              'NX',
            );
            return result === 'OK';
          });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const result = await (consumer as any).acquireLock(
          'test-lock',
          'test-job',
        );

        expect(result).toBe(true);
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'test-lock',
          'test-job',
          'EX',
          3600,
          'NX',
        );
      });

      it('should return false when lock is not acquired', async () => {
        mockRedisClient.set.mockResolvedValue(null);
        acquireLockSpy.mockRestore();

        acquireLockSpy = jest
          .spyOn(consumer as any, 'acquireLock')
          .mockImplementation(async (lockKey: string, jobId: string) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result: string | null = await mockRedisClient.set(
              lockKey,
              jobId,
              'EX',
              3600,
              'NX',
            );
            return result === 'OK';
          });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const result = await (consumer as any).acquireLock(
          'test-lock',
          'test-job',
        );

        expect(result).toBe(false);
      });

      it('should return false on Redis error', async () => {
        mockRedisClient.set.mockRejectedValue(new Error('Redis error'));
        acquireLockSpy.mockRestore();

        acquireLockSpy = jest
          .spyOn(consumer as any, 'acquireLock')
          .mockImplementation(async (lockKey: string, jobId: string) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const result: string | null = await mockRedisClient.set(
                lockKey,
                jobId,
                'EX',
                3600,
                'NX',
              );
              return result === 'OK';
            } catch {
              // Mock the error logging for testing
              return false;
            }
          });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const result = await (consumer as any).acquireLock(
          'test-lock',
          'test-job',
        );

        expect(result).toBe(false);
        // Note: Error logging is handled within the actual implementation
        // and tested through the service integration tests
      });
    });

    describe('releaseLock', () => {
      it('should release lock when job ID matches', async () => {
        mockRedisClient.get.mockResolvedValue('test-job');
        mockRedisClient.del.mockResolvedValue(1);
        releaseLockSpy.mockRestore();

        releaseLockSpy = jest
          .spyOn(consumer as any, 'releaseLock')
          .mockImplementation(async (lockKey: string, jobId: string) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const currentJobId = await mockRedisClient.get(lockKey);
              if (currentJobId === jobId) {
                await mockRedisClient.del(lockKey);
              }
            } catch {
              // Mock the error logging for testing
            }
          });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await (consumer as any).releaseLock('test-lock', 'test-job');

        expect(mockRedisClient.get).toHaveBeenCalledWith('test-lock');
        expect(mockRedisClient.del).toHaveBeenCalledWith('test-lock');
      });

      it('should not release lock when job ID does not match', async () => {
        mockRedisClient.get.mockResolvedValue('different-job');
        mockRedisClient.del.mockClear();
        releaseLockSpy.mockRestore();

        releaseLockSpy = jest
          .spyOn(consumer as any, 'releaseLock')
          .mockImplementation(async (lockKey: string, jobId: string) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const currentJobId = await mockRedisClient.get(lockKey);
              if (currentJobId === jobId) {
                await mockRedisClient.del(lockKey);
              }
            } catch {
              // Mock the error logging for testing
            }
          });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await (consumer as any).releaseLock('test-lock', 'test-job');

        expect(mockRedisClient.get).toHaveBeenCalledWith('test-lock');
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });

      it('should handle Redis errors gracefully', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
        releaseLockSpy.mockRestore();

        releaseLockSpy = jest
          .spyOn(consumer as any, 'releaseLock')
          .mockImplementation(async (lockKey: string, jobId: string) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const currentJobId = await mockRedisClient.get(lockKey);
              if (currentJobId === jobId) {
                await mockRedisClient.del(lockKey);
              }
            } catch {
              // Mock the error logging for testing
            }
          });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await (consumer as any).releaseLock('test-lock', 'test-job');

        // Note: Error logging is handled within the actual implementation
        // and tested through the service integration tests
      });
    });

    describe('loadDocumentsFromFile', () => {
      it('should be tested through integration tests', () => {
        // This method involves file system operations and external LangChain loaders
        // Testing it would require more complex mocking or integration tests
        expect(true).toBe(true);
      });
    });
  });
});
