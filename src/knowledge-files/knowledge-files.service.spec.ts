import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { KnowledgeFilesService } from './knowledge-files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateKnowledgeFileDto } from './dto/create-knowledge-file.dto';
import { UpdateKnowledgeFileDto } from './dto/update-knowledge-file.dto';
import { KnowledgeFile, Knowledge } from '../generated/prisma/client';

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
        take: 10,
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
      fileUrl: 'https://storage.example.com/test-document.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      status: 'pending',
      isActive: true,
    };

    it('should create knowledge file successfully', async () => {
      mockPrismaService.knowledge.findUnique.mockResolvedValue(mockKnowledge);
      mockPrismaService.knowledgeFile.create.mockResolvedValue(
        mockKnowledgeFileWithKnowledge,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.create(createDto);

      expect(result).toEqual(mockKnowledgeFileWithKnowledge);
      expect(mockPrismaService.knowledge.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.knowledgeId },
      });
      expect(mockPrismaService.knowledgeFile.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          status: 'pending',
          isActive: true,
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
});
