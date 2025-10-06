import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { KnowledgesService } from './knowledges.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { Knowledge } from '../generated/prisma/client';
import { PlaygroundQueryDto } from './dto/playground-query.dto';
import * as qdrantModule from '@langchain/community/vectorstores/qdrant';

describe('KnowledgesService', () => {
  let service: KnowledgesService;

  const mockKnowledge: Knowledge = {
    id: 'test-knowledge-uuid-123',
    name: 'Product Documentation',
    description: 'Contains all product documentation and user guides',
    category: 'documentation',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    knowledge: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    cachePrefixKnowledges: 'knowledges',
    cacheTtlKnowledges: 3600,
    qdrantDatabaseUrl: 'http://localhost:6333',
    openaiApiKey: 'test-api-key',
    vectorModel: 'text-embedding-3-small',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgesService,
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
      ],
    }).compile();

    service = module.get<KnowledgesService>(KnowledgesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached knowledge when found in cache', async () => {
      const whereInput = { id: 'test-knowledge-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockKnowledge);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockKnowledge);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'knowledges:findOne:id:test-knowledge-uuid-123',
      );
      expect(mockPrismaService.knowledge.findUnique).not.toHaveBeenCalled();
    });

    it('should return knowledge from database and cache it when not in cache', async () => {
      const whereInput = { id: 'test-knowledge-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockKnowledge);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'knowledges:findOne:id:test-knowledge-uuid-123',
      );
      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'knowledges:findOne:id:test-knowledge-uuid-123',
        mockKnowledge,
        3600,
      );
    });

    it('should return null when knowledge not found and not cache null result', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.knowledge.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'knowledges:findOne:id:non-existent-uuid',
      );
      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return array of knowledges with default parameters', async () => {
      const knowledges = [mockKnowledge];
      mockPrismaService.knowledge.findMany.mockResolvedValue(knowledges);

      const result = await service.findMany({});

      expect(result).toEqual(knowledges);
      expect(mockPrismaService.knowledge.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return array of knowledges with custom parameters', async () => {
      const knowledges = [mockKnowledge];
      const params = {
        skip: 0,
        take: 10,
        cursor: { id: 'test-knowledge-uuid-123' },
        where: { name: 'Product Documentation' },
        orderBy: { createdAt: 'desc' as const },
      };
      mockPrismaService.knowledge.findMany.mockResolvedValue(knowledges);

      const result = await service.findMany(params);

      expect(result).toEqual(knowledges);
      expect(mockPrismaService.knowledge.findMany).toHaveBeenCalledWith(params);
    });
  });

  describe('playground', () => {
    const knowledgeId = 'test-knowledge-uuid-123';
    const baseDto: PlaygroundQueryDto = {
      query: 'What is machine learning?',
      knowledgeFileIds: [],
    };

    beforeEach(() => {
      // mock prisma findUnique for knowledge validation
      mockPrismaService.knowledge.findUnique = jest.fn();
    });

    it('should throw NotFoundException if knowledge not found', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(null);

      await expect(service.playground(knowledgeId, baseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if knowledge inactive', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue({
        ...mockKnowledge,
        isActive: false,
      });

      await expect(service.playground(knowledgeId, baseDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should return chunks using vector search across all files when no file ids provided', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);

      // Spy on vector store usage by mocking method on prototype
      const similaritySpy = jest
        .spyOn(qdrantModule, 'QdrantVectorStore')
        .mockImplementation(
          () =>
            ({
              similaritySearchWithScore: jest
                .fn()
                .mockResolvedValue([
                  [{ pageContent: 'chunk content', metadata: { a: 1 } }, 0.9],
                ]),
            }) as unknown as InstanceType<
              typeof qdrantModule.QdrantVectorStore
            >,
        );

      const result = await service.playground(knowledgeId, baseDto);

      expect(result.fileChunkQuantity).toBe(1);
      expect(result.fileChunks[0].content).toBe('chunk content');
      expect(result.fileChunks[0].score).toBe(0.9);
      expect(similaritySpy).toHaveBeenCalled();
    });

    it('should filter by knowledgeFileIds when provided', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      const dto: PlaygroundQueryDto = {
        query: 'What is ML?',
        knowledgeFileIds: ['id-1', 'id-2'],
      };

      const mockSimilarity = jest.fn().mockResolvedValue([]);
      jest.spyOn(qdrantModule, 'QdrantVectorStore').mockImplementation(
        () =>
          ({
            similaritySearchWithScore: mockSimilarity,
          }) as unknown as InstanceType<typeof qdrantModule.QdrantVectorStore>,
      );

      await service.playground(knowledgeId, dto);

      expect(mockSimilarity).toHaveBeenCalledWith(dto.query, 3, {
        must: [
          {
            key: 'metadata.knowledgeFileId',
            match: { any: dto.knowledgeFileIds },
          },
        ],
      });
    });
  });

  describe('create', () => {
    const createKnowledgeDto: CreateKnowledgeDto = {
      name: 'Product Documentation',
      description: 'Contains all product documentation and user guides',
      category: 'documentation',
      isActive: true,
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
    });

    it('should create a knowledge and cache it', async () => {
      mockPrismaService.knowledge.create.mockResolvedValue(mockKnowledge);

      const result = await service.create(createKnowledgeDto);

      expect(result).toEqual(mockKnowledge);
      expect(mockPrismaService.knowledge.create).toHaveBeenCalledWith({
        data: {
          name: 'Product Documentation',
          description: 'Contains all product documentation and user guides',
          category: 'documentation',
          isActive: true,
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'knowledges:findOne:id:test-knowledge-uuid-123',
        mockKnowledge,
        3600,
      );
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['name'] },
      };
      mockPrismaService.knowledge.create.mockRejectedValue(prismaError);

      await expect(service.create(createKnowledgeDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createKnowledgeDto)).rejects.toThrow(
        'name already exists',
      );
    });

    it('should throw ConflictException with default field name when meta is missing', async () => {
      const prismaError = {
        code: 'P2002',
        meta: {},
      };
      mockPrismaService.knowledge.create.mockRejectedValue(prismaError);

      await expect(service.create(createKnowledgeDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createKnowledgeDto)).rejects.toThrow(
        'field already exists',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P2003',
      };
      mockPrismaService.knowledge.create.mockRejectedValue(prismaError);

      await expect(service.create(createKnowledgeDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(createKnowledgeDto)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const customError = new Error('Custom error');
      mockPrismaService.knowledge.create.mockRejectedValue(customError);

      await expect(service.create(createKnowledgeDto)).rejects.toThrow(
        'Custom error',
      );
    });
  });

  describe('update', () => {
    const updateKnowledgeDto: UpdateKnowledgeDto = {
      name: 'Updated Product Documentation',
      description: 'Updated description',
      category: 'updated-documentation',
      isActive: false,
    };

    const whereInput = { id: 'test-knowledge-uuid-123' };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should update knowledge and manage cache correctly', async () => {
      const updatedKnowledge = { ...mockKnowledge, ...updateKnowledgeDto };

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.update.mockResolvedValue(updatedKnowledge);

      const result = await service.update(whereInput, updateKnowledgeDto);

      expect(result).toEqual(updatedKnowledge);
      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.knowledge.update).toHaveBeenCalledWith({
        data: updateKnowledgeDto,
        where: whereInput,
      });
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'knowledges:findOne:id:test-knowledge-uuid-123',
      );
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'knowledges:findOne:id:test-knowledge-uuid-123',
        updatedKnowledge,
        3600,
      );
    });

    it('should throw NotFoundException when knowledge does not exist', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(null);

      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow('Knowledge not found');
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['name'] },
      };

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow('name already exists');
    });

    it('should throw NotFoundException on P2025 error (record not found)', async () => {
      const prismaError = {
        code: 'P2025',
      };

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow('Knowledge not found');
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P2003',
      };

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow('Database operation failed');
    });

    it('should re-throw non-Prisma errors', async () => {
      const customError = new Error('Custom update error');

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.update.mockRejectedValue(customError);

      await expect(
        service.update(whereInput, updateKnowledgeDto),
      ).rejects.toThrow('Custom update error');
    });
  });

  describe('delete', () => {
    const whereInput = { id: 'test-knowledge-uuid-123' };

    beforeEach(() => {
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should delete knowledge and invalidate cache', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.delete.mockResolvedValue(mockKnowledge);

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockKnowledge);
      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.knowledge.delete).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'knowledges:findOne:id:test-knowledge-uuid-123',
      );
    });

    it('should throw NotFoundException when knowledge does not exist before delete', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(null);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Knowledge not found',
      );
    });

    it('should throw NotFoundException on P2025 error (record not found)', async () => {
      const prismaError = {
        code: 'P2025',
      };

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Knowledge not found',
      );
    });

    it('should throw ConflictException on foreign key constraint violation', async () => {
      const prismaError = {
        code: 'P2003',
      };

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Cannot delete knowledge as it is being used by chat agents or files',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P2001',
      };

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const customError = new Error('Custom delete error');

      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledge.delete.mockRejectedValue(customError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        'Custom delete error',
      );
    });
  });

  describe('private methods', () => {
    describe('generateCacheKey', () => {
      it('should generate correct cache key with id parameter', () => {
        // Access private method through bracket notation for testing
        const cacheKey = (
          service as unknown as {
            generateCacheKey: (
              operation: string,
              where: { id: string },
            ) => string;
          }
        ).generateCacheKey('findOne', {
          id: 'test-id',
        });
        expect(cacheKey).toBe('knowledges:findOne:id:test-id');
      });
    });

    describe('invalidateKnowledgeCache', () => {
      it('should call del with correct cache key', async () => {
        // Access private method through bracket notation for testing
        await (
          service as unknown as {
            invalidateKnowledgeCache: (knowledge: Knowledge) => Promise<void>;
          }
        ).invalidateKnowledgeCache(mockKnowledge);

        expect(mockCachesService.del).toHaveBeenCalledWith(
          'knowledges:findOne:id:test-knowledge-uuid-123',
        );
      });
    });
  });
});
