import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { KnowledgesService } from './knowledges.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { Knowledge } from '../generated/prisma/client';

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
  });
});
