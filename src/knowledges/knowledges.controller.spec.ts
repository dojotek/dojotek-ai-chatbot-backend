import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { KnowledgesController } from './knowledges.controller';
import { KnowledgesService } from './knowledges.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { Knowledge } from './entities/knowledge.entity';

describe('KnowledgesController', () => {
  let controller: KnowledgesController;

  const mockKnowledge: Knowledge = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    name: 'Product Documentation',
    description: 'Contains all product documentation and user guides',
    category: 'documentation',
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockCreateKnowledgeDto: CreateKnowledgeDto = {
    name: 'Product Documentation',
    description: 'Contains all product documentation and user guides',
    category: 'documentation',
    isActive: true,
  };

  const mockUpdateKnowledgeDto: UpdateKnowledgeDto = {
    description: 'Updated description for product documentation',
  };

  const mockKnowledgesService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgesController],
      providers: [
        {
          provide: KnowledgesService,
          useValue: mockKnowledgesService,
        },
      ],
    }).compile();

    controller = module.get<KnowledgesController>(KnowledgesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a knowledge successfully', async () => {
      mockKnowledgesService.create.mockResolvedValue(mockKnowledge);

      const result = await controller.create(mockCreateKnowledgeDto);

      expect(mockKnowledgesService.create).toHaveBeenCalledWith(
        mockCreateKnowledgeDto,
      );
      expect(result).toEqual(mockKnowledge);
    });

    it('should handle ConflictException when knowledge name already exists', async () => {
      const conflictException = new ConflictException('name already exists');
      mockKnowledgesService.create.mockRejectedValue(conflictException);

      await expect(controller.create(mockCreateKnowledgeDto)).rejects.toThrow(
        conflictException,
      );
      expect(mockKnowledgesService.create).toHaveBeenCalledWith(
        mockCreateKnowledgeDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockKnowledgesService.create.mockRejectedValue(internalServerError);

      await expect(controller.create(mockCreateKnowledgeDto)).rejects.toThrow(
        internalServerError,
      );
      expect(mockKnowledgesService.create).toHaveBeenCalledWith(
        mockCreateKnowledgeDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all knowledges successfully without search parameters', async () => {
      const mockKnowledges = [mockKnowledge];
      mockKnowledgesService.findMany.mockResolvedValue(mockKnowledges);

      const result = await controller.findAll();

      expect(mockKnowledgesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledges);
    });

    it('should return knowledges with pagination parameters', async () => {
      const mockKnowledges = [mockKnowledge];
      mockKnowledgesService.findMany.mockResolvedValue(mockKnowledges);

      const result = await controller.findAll(0, 5);

      expect(mockKnowledgesService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledges);
    });

    it('should return knowledges with search parameter', async () => {
      const mockKnowledges = [mockKnowledge];
      mockKnowledgesService.findMany.mockResolvedValue(mockKnowledges);

      const result = await controller.findAll(undefined, undefined, 'product');

      expect(mockKnowledgesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          OR: [
            { name: { contains: 'product', mode: 'insensitive' } },
            { description: { contains: 'product', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledges);
    });

    it('should return knowledges with category filter', async () => {
      const mockKnowledges = [mockKnowledge];
      mockKnowledgesService.findMany.mockResolvedValue(mockKnowledges);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        'documentation',
      );

      expect(mockKnowledgesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          category: { contains: 'documentation', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledges);
    });

    it('should return knowledges with isActive filter', async () => {
      const mockKnowledges = [mockKnowledge];
      mockKnowledgesService.findMany.mockResolvedValue(mockKnowledges);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        'true',
      );

      expect(mockKnowledgesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledges);
    });
  });

  describe('findOne', () => {
    it('should return a knowledge by id successfully', async () => {
      mockKnowledgesService.findOne.mockResolvedValue(mockKnowledge);

      const result = await controller.findOne(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockKnowledgesService.findOne).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toEqual(mockKnowledge);
    });

    it('should return null when knowledge is not found', async () => {
      mockKnowledgesService.findOne.mockResolvedValue(null);

      const result = await controller.findOne('non-existent-id');

      expect(mockKnowledgesService.findOne).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a knowledge successfully', async () => {
      const updatedKnowledge = {
        ...mockKnowledge,
        description: 'Updated description for product documentation',
      };
      mockKnowledgesService.update.mockResolvedValue(updatedKnowledge);

      const result = await controller.update(
        '01234567-89ab-cdef-0123-456789abcdef',
        mockUpdateKnowledgeDto,
      );

      expect(mockKnowledgesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateKnowledgeDto,
      );
      expect(result).toEqual(updatedKnowledge);
    });

    it('should handle NotFoundException when knowledge is not found', async () => {
      const notFoundException = new NotFoundException('Knowledge not found');
      mockKnowledgesService.update.mockRejectedValue(notFoundException);

      await expect(
        controller.update('non-existent-id', mockUpdateKnowledgeDto),
      ).rejects.toThrow(notFoundException);

      expect(mockKnowledgesService.update).toHaveBeenCalledWith(
        { id: 'non-existent-id' },
        mockUpdateKnowledgeDto,
      );
    });

    it('should handle ConflictException when knowledge name already exists', async () => {
      const conflictException = new ConflictException('name already exists');
      mockKnowledgesService.update.mockRejectedValue(conflictException);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateKnowledgeDto,
        ),
      ).rejects.toThrow(conflictException);

      expect(mockKnowledgesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateKnowledgeDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockKnowledgesService.update.mockRejectedValue(internalServerError);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateKnowledgeDto,
        ),
      ).rejects.toThrow(internalServerError);

      expect(mockKnowledgesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateKnowledgeDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a knowledge successfully', async () => {
      mockKnowledgesService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockKnowledgesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toBeUndefined();
    });

    it('should handle NotFoundException when knowledge is not found', async () => {
      const notFoundException = new NotFoundException('Knowledge not found');
      mockKnowledgesService.delete.mockRejectedValue(notFoundException);

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        notFoundException,
      );
      expect(mockKnowledgesService.delete).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
    });

    it('should handle ConflictException when knowledge is being used by chat agents or files', async () => {
      const conflictException = new ConflictException(
        'Cannot delete knowledge as it is being used by chat agents or files',
      );
      mockKnowledgesService.delete.mockRejectedValue(conflictException);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(conflictException);

      expect(mockKnowledgesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockKnowledgesService.delete.mockRejectedValue(internalServerError);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(internalServerError);

      expect(mockKnowledgesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });
  });
});
