import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { KnowledgeFilesController } from './knowledge-files.controller';
import { KnowledgeFilesService } from './knowledge-files.service';
import { CreateKnowledgeFileDto } from './dto/create-knowledge-file.dto';
import { UpdateKnowledgeFileDto } from './dto/update-knowledge-file.dto';

describe('KnowledgeFilesController', () => {
  let controller: KnowledgeFilesController;

  const mockKnowledgeFile = {
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
    knowledge: {
      id: 'test-knowledge-uuid',
      name: 'Test Knowledge',
      description: 'Test knowledge description',
      category: 'test',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockCreateKnowledgeFileDto: CreateKnowledgeFileDto = {
    knowledgeId: 'test-knowledge-uuid',
    fileName: 'test-document.pdf',
    fileUrl: 'https://storage.example.com/test-document.pdf',
    fileType: 'application/pdf',
    fileSize: 1024000,
    status: 'pending',
    isActive: true,
  };

  const mockUpdateKnowledgeFileDto: UpdateKnowledgeFileDto = {
    fileName: 'updated-document.pdf',
    status: 'processed',
  };

  const mockKnowledgeFilesService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeFilesController],
      providers: [
        {
          provide: KnowledgeFilesService,
          useValue: mockKnowledgeFilesService,
        },
      ],
    }).compile();

    controller = module.get<KnowledgeFilesController>(KnowledgeFilesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a knowledge file successfully', async () => {
      mockKnowledgeFilesService.create.mockResolvedValue(mockKnowledgeFile);

      const result = await controller.create(mockCreateKnowledgeFileDto);

      expect(mockKnowledgeFilesService.create).toHaveBeenCalledWith(
        mockCreateKnowledgeFileDto,
      );
      expect(result).toEqual(mockKnowledgeFile);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Knowledge not found',
        HttpStatus.NOT_FOUND,
      );
      mockKnowledgeFilesService.create.mockRejectedValue(httpException);

      await expect(
        controller.create(mockCreateKnowledgeFileDto),
      ).rejects.toThrow(httpException);
      expect(mockKnowledgeFilesService.create).toHaveBeenCalledWith(
        mockCreateKnowledgeFileDto,
      );
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockKnowledgeFilesService.create.mockRejectedValue(unexpectedError);

      await expect(
        controller.create(mockCreateKnowledgeFileDto),
      ).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while creating knowledge file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockKnowledgeFilesService.create).toHaveBeenCalledWith(
        mockCreateKnowledgeFileDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all knowledge files successfully', async () => {
      const mockKnowledgeFiles = [mockKnowledgeFile];
      mockKnowledgeFilesService.findMany.mockResolvedValue(mockKnowledgeFiles);

      const result = await controller.findAll();

      expect(mockKnowledgeFilesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledgeFiles);
    });

    it('should return knowledge files with query parameters', async () => {
      const mockKnowledgeFiles = [mockKnowledgeFile];
      mockKnowledgeFilesService.findMany.mockResolvedValue(mockKnowledgeFiles);

      const result = await controller.findAll(
        0, // skip
        5, // take
        'test-knowledge-uuid', // knowledgeId
        'processed', // status
        'document', // search
      );

      expect(mockKnowledgeFilesService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: {
          knowledgeId: 'test-knowledge-uuid',
          status: 'processed',
          OR: [
            { fileName: { contains: 'document', mode: 'insensitive' } },
            { fileType: { contains: 'document', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledgeFiles);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockKnowledgeFilesService.findMany.mockRejectedValue(httpException);

      await expect(controller.findAll()).rejects.toThrow(httpException);
      expect(mockKnowledgeFilesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockKnowledgeFilesService.findMany.mockRejectedValue(unexpectedError);

      await expect(controller.findAll()).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching knowledge files',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockKnowledgeFilesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a knowledge file successfully', async () => {
      mockKnowledgeFilesService.findOne.mockResolvedValue(mockKnowledgeFile);

      const result = await controller.findOne('test-uuid-123');

      expect(mockKnowledgeFilesService.findOne).toHaveBeenCalledWith({
        id: 'test-uuid-123',
      });
      expect(result).toEqual(mockKnowledgeFile);
    });

    it('should throw HttpException when knowledge file not found', async () => {
      mockKnowledgeFilesService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('non-existent-uuid')).rejects.toThrow(
        new HttpException('Knowledge file not found', HttpStatus.NOT_FOUND),
      );
      expect(mockKnowledgeFilesService.findOne).toHaveBeenCalledWith({
        id: 'non-existent-uuid',
      });
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockKnowledgeFilesService.findOne.mockRejectedValue(httpException);

      await expect(controller.findOne('test-uuid-123')).rejects.toThrow(
        httpException,
      );
      expect(mockKnowledgeFilesService.findOne).toHaveBeenCalledWith({
        id: 'test-uuid-123',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockKnowledgeFilesService.findOne.mockRejectedValue(unexpectedError);

      await expect(controller.findOne('test-uuid-123')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching knowledge file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockKnowledgeFilesService.findOne).toHaveBeenCalledWith({
        id: 'test-uuid-123',
      });
    });
  });

  describe('findByKnowledge', () => {
    it('should return knowledge files for a specific knowledge', async () => {
      const mockKnowledgeFiles = [mockKnowledgeFile];
      mockKnowledgeFilesService.findMany.mockResolvedValue(mockKnowledgeFiles);

      const result = await controller.findByKnowledge('test-knowledge-uuid');

      expect(mockKnowledgeFilesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: { knowledgeId: 'test-knowledge-uuid' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledgeFiles);
    });

    it('should return knowledge files with pagination', async () => {
      const mockKnowledgeFiles = [mockKnowledgeFile];
      mockKnowledgeFilesService.findMany.mockResolvedValue(mockKnowledgeFiles);

      const result = await controller.findByKnowledge(
        'test-knowledge-uuid',
        0,
        5,
      );

      expect(mockKnowledgeFilesService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: { knowledgeId: 'test-knowledge-uuid' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKnowledgeFiles);
    });

    it('should throw HttpException when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockKnowledgeFilesService.findMany.mockRejectedValue(unexpectedError);

      await expect(
        controller.findByKnowledge('test-knowledge-uuid'),
      ).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching knowledge files',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('update', () => {
    it('should update a knowledge file successfully', async () => {
      mockKnowledgeFilesService.update.mockResolvedValue(mockKnowledgeFile);

      const result = await controller.update(
        'test-uuid-123',
        mockUpdateKnowledgeFileDto,
      );

      expect(mockKnowledgeFilesService.update).toHaveBeenCalledWith(
        { id: 'test-uuid-123' },
        mockUpdateKnowledgeFileDto,
      );
      expect(result).toEqual(mockKnowledgeFile);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Knowledge file not found',
        HttpStatus.NOT_FOUND,
      );
      mockKnowledgeFilesService.update.mockRejectedValue(httpException);

      await expect(
        controller.update('test-uuid-123', mockUpdateKnowledgeFileDto),
      ).rejects.toThrow(httpException);
      expect(mockKnowledgeFilesService.update).toHaveBeenCalledWith(
        { id: 'test-uuid-123' },
        mockUpdateKnowledgeFileDto,
      );
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockKnowledgeFilesService.update.mockRejectedValue(unexpectedError);

      await expect(
        controller.update('test-uuid-123', mockUpdateKnowledgeFileDto),
      ).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while updating knowledge file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockKnowledgeFilesService.update).toHaveBeenCalledWith(
        { id: 'test-uuid-123' },
        mockUpdateKnowledgeFileDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a knowledge file successfully', async () => {
      mockKnowledgeFilesService.delete.mockResolvedValue(mockKnowledgeFile);

      await controller.remove('test-uuid-123');

      expect(mockKnowledgeFilesService.delete).toHaveBeenCalledWith({
        id: 'test-uuid-123',
      });
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Knowledge file not found',
        HttpStatus.NOT_FOUND,
      );
      mockKnowledgeFilesService.delete.mockRejectedValue(httpException);

      await expect(controller.remove('test-uuid-123')).rejects.toThrow(
        httpException,
      );
      expect(mockKnowledgeFilesService.delete).toHaveBeenCalledWith({
        id: 'test-uuid-123',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockKnowledgeFilesService.delete.mockRejectedValue(unexpectedError);

      await expect(controller.remove('test-uuid-123')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while deleting knowledge file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockKnowledgeFilesService.delete).toHaveBeenCalledWith({
        id: 'test-uuid-123',
      });
    });
  });
});
