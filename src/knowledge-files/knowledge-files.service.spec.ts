// Mock external dependencies before any imports
const mockVectorStore = {
  similaritySearchWithScore: jest.fn(),
};

jest.mock('@langchain/community/vectorstores/qdrant', () => ({
  QdrantVectorStore: jest.fn().mockImplementation(() => mockVectorStore),
}));

jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { KnowledgeFilesService } from './knowledge-files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { LogsService } from '../logs/logs.service';
import { CreateKnowledgeFileDto } from './dto/create-knowledge-file.dto';
import { UpdateKnowledgeFileDto } from './dto/update-knowledge-file.dto';
import { AcknowledgeUploadDto } from './dto/acknowledge-upload.dto';
import { PlaygroundQueryDto } from './dto/playground-query.dto';
import { KnowledgeFile, Knowledge } from '../generated/prisma/client';
import { STORAGE_SERVICE } from '../storage/constants';
import type { IStorageService } from '../storage/storage.interface';

describe('KnowledgeFilesService', () => {
  let service: KnowledgeFilesService;

  const mockKnowledge: Knowledge = {
    id: 'test-knowledge-uuid',
    name: 'Test Knowledge',
    description: 'Test knowledge description',
    category: 'test',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKnowledgeFile: KnowledgeFile = {
    id: 'test-uuid-123',
    knowledgeId: 'test-knowledge-uuid',
    fileName: 'test-document.pdf',
    fileUrl: 'https://storage.example.com/test-document.pdf',
    fileType: 'application/pdf',
    fileSize: 1024000,
    status: 'processed',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKnowledgeFileWithKnowledge = {
    ...mockKnowledgeFile,
    knowledge: mockKnowledge,
  };

  const mockPrismaService = {
    knowledgeFile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    knowledge: {
      findUnique: jest.fn(),
    },
  };

  const mockCachesService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const mockConfigsService = {
    cachePrefixKnowledgeFiles: 'knowledge-files',
    cacheTtlKnowledgeFiles: 3600,
    openaiApiKey: 'test-api-key',
    vectorModel: 'text-embedding-3-small',
    qdrantDatabaseUrl: 'http://localhost:6333',
  };

  const mockLogsService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logSafe: jest.fn(),
  };

  const mockStorageService: jest.Mocked<IStorageService> = {
    presignUpload: jest.fn(),
    presignDownload: jest.fn(),
    putObject: jest.fn(),
    getObjectStream: jest.fn(),
    deleteObject: jest.fn(),
  };

  const mockVectorizeQueue: jest.Mocked<Pick<Queue, 'add'>> = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeFilesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CachesService,
          useValue: mockCachesService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: STORAGE_SERVICE,
          useValue: mockStorageService,
        },
        {
          provide: getQueueToken('knowledge-files/vectorize'),
          useValue: mockVectorizeQueue,
        },
      ],
    }).compile();

    service = module.get<KnowledgeFilesService>(KnowledgeFilesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached knowledge file when found in cache', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockKnowledgeFileWithKnowledge);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockKnowledgeFileWithKnowledge);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'knowledge-files:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.knowledgeFile.findUnique).not.toHaveBeenCalled();
    });

    it('should return knowledge file from database and cache it when not in cache', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        mockKnowledgeFileWithKnowledge,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockKnowledgeFileWithKnowledge);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'knowledge-files:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: whereInput,
        include: {
          knowledge: true,
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'knowledge-files:findOne:id:test-uuid-123',
        mockKnowledgeFileWithKnowledge,
        3600,
      );
    });

    it('should return null when knowledge file not found and not cache null result', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'knowledge-files:findOne:id:non-existent-uuid',
      );
      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: whereInput,
        include: {
          knowledge: true,
        },
      });
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return knowledge files from database', async () => {
      const params = {
        skip: 0,
        take: 3,
        where: { knowledgeId: 'test-knowledge-uuid' },
        orderBy: { createdAt: 'desc' as const },
      };
      const mockResults = [mockKnowledgeFileWithKnowledge];
      mockPrismaService.knowledgeFile.findMany.mockResolvedValue(mockResults);

      const result = await service.findMany(params);

      expect(result).toEqual(mockResults);
      expect(mockPrismaService.knowledgeFile.findMany).toHaveBeenCalledWith({
        ...params,
        include: {
          knowledge: true,
        },
      });
    });
  });

  describe('create', () => {
    const createDto: CreateKnowledgeFileDto = {
      knowledgeId: 'test-knowledge-uuid',
      fileName: 'test-document.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      status: 'pending',
    };

    it('should create knowledge file successfully with presigned URL', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockStorageService.presignUpload.mockResolvedValue({
        method: 'PUT',
        key: 'knowledge-files/2023-12-25/uuid.pdf',
        url: 'https://s3.amazonaws.com/bucket/knowledge-files/2023-12-25/uuid.pdf?presigned=true',
        expiresInMinutes: 60,
      });
      mockPrismaService.knowledgeFile.create.mockResolvedValue(
        mockKnowledgeFileWithKnowledge,
      );
      mockCachesService.set.mockResolvedValue('OK');

      // Mock Date to ensure consistent storage key generation
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2023-12-25T00:00:00.000Z');

      const result = await service.create(createDto);

      expect(result).toMatchObject({
        knowledgeFile: mockKnowledgeFileWithKnowledge,
        uploadUrl:
          'https://s3.amazonaws.com/bucket/knowledge-files/2023-12-25/uuid.pdf?presigned=true',
        method: 'PUT',
        expiresInMinutes: 60,
      });
      expect(result.storageKey).toMatch(
        /^knowledge-files\/2023-12-25\/[a-f0-9-]+\.pdf$/,
      );

      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.knowledgeId },
      });

      const presignUploadSpy = jest.spyOn(mockStorageService, 'presignUpload');
      expect(presignUploadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringMatching(
            /^knowledge-files\/2023-12-25\/[a-f0-9-]+\.pdf$/,
          ) as string,
          contentType: 'application/pdf',
          expiresInMinutes: 60,
        }),
      );

      expect(mockPrismaService.knowledgeFile.create).toHaveBeenCalledWith({
        data: {
          knowledgeId: createDto.knowledgeId,
          fileName: createDto.fileName,
          fileUrl: expect.stringMatching(
            /^knowledge-files\/2023-12-25\/[a-f0-9-]+\.pdf$/,
          ) as string,
          fileType: 'application/pdf',
          fileSize: createDto.fileSize,
          status: 'pending',
          isActive: false,
        },
        include: {
          knowledge: true,
        },
      });

      expect(mockCachesService.set).toHaveBeenCalledWith(
        'knowledge-files:findOne:id:test-uuid-123',
        mockKnowledgeFileWithKnowledge,
        3600,
      );
    });

    it('should throw NotFoundException when knowledge does not exist', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('Knowledge not found'),
      );

      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.knowledgeId },
      });
      expect(mockPrismaService.knowledgeFile.create).not.toHaveBeenCalled();
    });

    it('should handle Prisma unique constraint violation', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledgeFile.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['fileName'] },
      });

      await expect(service.create(createDto)).rejects.toThrow(
        new ConflictException('fileName already exists'),
      );
    });

    it('should handle Prisma foreign key constraint violation', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledgeFile.create.mockRejectedValue({
        code: 'P2003',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        new ConflictException('Knowledge not found'),
      );
    });

    it('should handle other Prisma errors', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledgeFile.create.mockRejectedValue({
        code: 'P2999',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        new InternalServerErrorException('Database operation failed'),
      );
    });
  });

  describe('acknowledgeFileUploaded', () => {
    const acknowledgeDto: AcknowledgeUploadDto = {
      id: 'test-uuid-123',
      fileSize: 2048000,
    };

    it('should acknowledge file upload successfully and queue vectorization', async () => {
      const pendingKnowledgeFile = { ...mockKnowledgeFile, status: 'pending' };
      const updatedKnowledgeFile = {
        ...mockKnowledgeFileWithKnowledge,
        fileSize: 2048000,
      };

      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        pendingKnowledgeFile,
      );
      mockPrismaService.knowledgeFile.update.mockResolvedValue(
        updatedKnowledgeFile,
      );
      const mockJob: Partial<Job> = {
        id: 'mock-job-id',
        name: 'vectorize-file',
        data: { knowledgeFileId: 'test-uuid-123' },
      };
      mockVectorizeQueue.add.mockResolvedValue(mockJob as Job);
      mockCachesService.del.mockResolvedValue(1);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.acknowledgeFileUploaded(acknowledgeDto);

      expect(result).toEqual(updatedKnowledgeFile);
      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: { id: acknowledgeDto.id },
      });
      expect(mockPrismaService.knowledgeFile.update).toHaveBeenCalledWith({
        where: { id: acknowledgeDto.id },
        data: { fileSize: acknowledgeDto.fileSize },
        include: { knowledge: true },
      });
      expect(mockVectorizeQueue.add).toHaveBeenCalledWith(
        'vectorize-file',
        {
          knowledgeFileId: updatedKnowledgeFile.id,
          storageKey: updatedKnowledgeFile.fileUrl,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    });

    it('should throw NotFoundException when knowledge file does not exist', async () => {
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(null);

      await expect(
        service.acknowledgeFileUploaded(acknowledgeDto),
      ).rejects.toThrow(new NotFoundException('Knowledge file not found'));

      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: { id: acknowledgeDto.id },
      });
      expect(mockPrismaService.knowledgeFile.update).not.toHaveBeenCalled();
      expect(mockVectorizeQueue.add).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when knowledge file status is not pending', async () => {
      const processedKnowledgeFile = {
        ...mockKnowledgeFile,
        status: 'processed',
      };
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        processedKnowledgeFile,
      );

      await expect(
        service.acknowledgeFileUploaded(acknowledgeDto),
      ).rejects.toThrow(
        new BadRequestException(
          'Cannot acknowledge upload for file with status: processed',
        ),
      );

      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: { id: acknowledgeDto.id },
      });
      expect(mockPrismaService.knowledgeFile.update).not.toHaveBeenCalled();
      expect(mockVectorizeQueue.add).not.toHaveBeenCalled();
    });

    it('should handle queue errors gracefully', async () => {
      const pendingKnowledgeFile = { ...mockKnowledgeFile, status: 'pending' };
      const updatedKnowledgeFile = {
        ...mockKnowledgeFileWithKnowledge,
        fileSize: 2048000,
      };

      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        pendingKnowledgeFile,
      );
      mockPrismaService.knowledgeFile.update.mockResolvedValue(
        updatedKnowledgeFile,
      );
      mockVectorizeQueue.add.mockRejectedValue(
        new Error('Queue connection failed'),
      );

      await expect(
        service.acknowledgeFileUploaded(acknowledgeDto),
      ).rejects.toThrow('Queue connection failed');

      expect(mockPrismaService.knowledgeFile.update).toHaveBeenCalled();
      expect(mockVectorizeQueue.add).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateKnowledgeFileDto = {
      fileName: 'updated-document.pdf',
      status: 'processed',
    };

    it('should update knowledge file successfully', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        mockKnowledgeFile,
      );
      mockPrismaService.knowledgeFile.update.mockResolvedValue(
        mockKnowledgeFileWithKnowledge,
      );
      mockCachesService.del.mockResolvedValue(1);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update(whereInput, updateDto);

      expect(result).toEqual(mockKnowledgeFileWithKnowledge);
      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.knowledgeFile.update).toHaveBeenCalledWith({
        data: updateDto,
        where: whereInput,
        include: {
          knowledge: true,
        },
      });
    });

    it('should throw NotFoundException when knowledge file does not exist', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(null);

      await expect(service.update(whereInput, updateDto)).rejects.toThrow(
        new NotFoundException('Knowledge file not found'),
      );

      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.knowledgeFile.update).not.toHaveBeenCalled();
    });

    it('should validate knowledge exists when updating knowledgeId', async () => {
      const whereInput = { id: 'test-uuid-123' };
      const updateDtoWithKnowledge: UpdateKnowledgeFileDto = {
        ...updateDto,
        knowledgeId: 'new-knowledge-uuid',
      };

      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        mockKnowledgeFile,
      );
      mockPrismaService.knowledge.findUnique.mockResolvedValue(null);

      await expect(
        service.update(whereInput, updateDtoWithKnowledge),
      ).rejects.toThrow(new NotFoundException('Knowledge not found'));

      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-knowledge-uuid' },
      });
    });
  });

  describe('delete', () => {
    it('should delete knowledge file successfully', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        mockKnowledgeFile,
      );
      mockPrismaService.knowledgeFile.delete.mockResolvedValue(
        mockKnowledgeFileWithKnowledge,
      );
      mockCachesService.del.mockResolvedValue(1);

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockKnowledgeFileWithKnowledge);
      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.knowledgeFile.delete).toHaveBeenCalledWith({
        where: whereInput,
        include: {
          knowledge: true,
        },
      });
    });

    it('should throw NotFoundException when knowledge file does not exist', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(null);

      await expect(service.delete(whereInput)).rejects.toThrow(
        new NotFoundException('Knowledge file not found'),
      );

      expect(mockPrismaService.knowledgeFile.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.knowledgeFile.delete).not.toHaveBeenCalled();
    });

    it('should handle Prisma record not found error', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        mockKnowledgeFile,
      );
      mockPrismaService.knowledgeFile.delete.mockRejectedValue({
        code: 'P2025',
      });

      await expect(service.delete(whereInput)).rejects.toThrow(
        new NotFoundException('Knowledge file not found'),
      );
    });
  });

  describe('playground', () => {
    const mockPlaygroundQueryDto: PlaygroundQueryDto = {
      query: 'What is machine learning?',
      knowledgeFileId: 'test-uuid-123',
    };

    const mockProcessedKnowledgeFile = {
      ...mockKnowledgeFileWithKnowledge,
      status: 'processed',
      isActive: true,
    };

    const mockVectorStoreResults = [
      [
        {
          pageContent:
            'Machine learning is a subset of artificial intelligence...',
          metadata: {
            source: 'test-document.pdf#doc-0-chunk-5',
            knowledgeFileId: 'test-uuid-123',
            knowledgeId: 'test-knowledge-uuid',
            fileName: 'test-document.pdf',
            fileType: 'application/pdf',
            chunkIndex: 5,
            documentIndex: 0,
          },
        },
        0.95,
      ],
      [
        {
          pageContent: 'AI systems can learn and improve from experience...',
          metadata: {
            source: 'test-document.pdf#doc-0-chunk-12',
            knowledgeFileId: 'test-uuid-123',
            knowledgeId: 'test-knowledge-uuid',
            fileName: 'test-document.pdf',
            fileType: 'application/pdf',
            chunkIndex: 12,
            documentIndex: 0,
          },
        },
        0.87,
      ],
    ];

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should perform playground search successfully', async () => {
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(
        mockProcessedKnowledgeFile,
      );
      mockCachesService.get.mockResolvedValue(mockProcessedKnowledgeFile);
      mockVectorStore.similaritySearchWithScore.mockResolvedValue(
        mockVectorStoreResults,
      );

      const result = await service.playground(mockPlaygroundQueryDto);

      expect(result).toEqual({
        fileChunkQuantity: 2,
        fileChunks: [
          {
            content:
              'Machine learning is a subset of artificial intelligence...',
            score: 0.95,
            metadata: {
              source: 'test-document.pdf#doc-0-chunk-5',
              knowledgeFileId: 'test-uuid-123',
              knowledgeId: 'test-knowledge-uuid',
              fileName: 'test-document.pdf',
              fileType: 'application/pdf',
              chunkIndex: 5,
              documentIndex: 0,
            },
          },
          {
            content: 'AI systems can learn and improve from experience...',
            score: 0.87,
            metadata: {
              source: 'test-document.pdf#doc-0-chunk-12',
              knowledgeFileId: 'test-uuid-123',
              knowledgeId: 'test-knowledge-uuid',
              fileName: 'test-document.pdf',
              fileType: 'application/pdf',
              chunkIndex: 12,
              documentIndex: 0,
            },
          },
        ],
      });

      expect(mockVectorStore.similaritySearchWithScore).toHaveBeenCalledWith(
        'What is machine learning?',
        3,
        {
          must: [
            {
              key: 'metadata.knowledgeFileId',
              match: {
                value: 'test-uuid-123',
              },
            },
          ],
        },
      );
    });

    it('should throw NotFoundException when knowledge file does not exist', async () => {
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.knowledgeFile.findUnique.mockResolvedValue(null);

      await expect(service.playground(mockPlaygroundQueryDto)).rejects.toThrow(
        new NotFoundException('Knowledge file not found'),
      );
    });

    it('should throw BadRequestException when knowledge file is not processed', async () => {
      const pendingKnowledgeFile = {
        ...mockKnowledgeFileWithKnowledge,
        status: 'pending',
        isActive: true,
      };
      mockCachesService.get.mockResolvedValue(pendingKnowledgeFile);

      await expect(service.playground(mockPlaygroundQueryDto)).rejects.toThrow(
        new BadRequestException(
          'Knowledge file is not processed yet. Current status: pending',
        ),
      );
    });

    it('should throw BadRequestException when knowledge file is not active', async () => {
      const inactiveKnowledgeFile = {
        ...mockKnowledgeFileWithKnowledge,
        status: 'processed',
        isActive: false,
      };
      mockCachesService.get.mockResolvedValue(inactiveKnowledgeFile);

      await expect(service.playground(mockPlaygroundQueryDto)).rejects.toThrow(
        new BadRequestException('Knowledge file is not active'),
      );
    });

    it('should handle vector store errors gracefully', async () => {
      mockCachesService.get.mockResolvedValue(mockProcessedKnowledgeFile);
      mockVectorStore.similaritySearchWithScore.mockRejectedValue(
        new Error('Vector database connection failed'),
      );

      await expect(service.playground(mockPlaygroundQueryDto)).rejects.toThrow(
        new InternalServerErrorException(
          'An error occurred while searching the knowledge file',
        ),
      );
    });

    it('should return empty results when no chunks are found', async () => {
      mockCachesService.get.mockResolvedValue(mockProcessedKnowledgeFile);
      mockVectorStore.similaritySearchWithScore.mockResolvedValue([]);

      const result = await service.playground(mockPlaygroundQueryDto);

      expect(result).toEqual({
        fileChunkQuantity: 0,
        fileChunks: [],
      });
    });
  });
});
