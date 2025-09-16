import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatAgentsController } from './chat-agents.controller';
import { ChatAgentsService } from './chat-agents.service';
import { CreateChatAgentDto } from './dto/create-chat-agent.dto';
import { UpdateChatAgentDto } from './dto/update-chat-agent.dto';

describe('ChatAgentsController', () => {
  let controller: ChatAgentsController;

  const mockChatAgent = {
    id: '1',
    customerId: 'customer-1',
    name: 'Customer Support Bot',
    description: 'An AI assistant for customer support inquiries',
    systemPrompt:
      'You are a helpful customer support assistant. Always be polite and professional.',
    config: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateChatAgentDto: CreateChatAgentDto = {
    customerId: 'customer-1',
    name: 'Customer Support Bot',
    description: 'An AI assistant for customer support inquiries',
    systemPrompt:
      'You are a helpful customer support assistant. Always be polite and professional.',
    config: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 },
    isActive: true,
  };

  const mockUpdateChatAgentDto: UpdateChatAgentDto = {
    name: 'Updated Support Bot',
    description: 'Updated AI assistant',
  };

  const mockChatAgentsService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatAgentsController],
      providers: [
        {
          provide: ChatAgentsService,
          useValue: mockChatAgentsService,
        },
      ],
    }).compile();

    controller = module.get<ChatAgentsController>(ChatAgentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a chat agent successfully', async () => {
      mockChatAgentsService.create.mockResolvedValue(mockChatAgent);

      const result = await controller.create(mockCreateChatAgentDto);

      expect(mockChatAgentsService.create).toHaveBeenCalledWith(
        mockCreateChatAgentDto,
      );
      expect(result).toEqual(mockChatAgent);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Customer not found',
        HttpStatus.CONFLICT,
      );
      mockChatAgentsService.create.mockRejectedValue(httpException);

      await expect(controller.create(mockCreateChatAgentDto)).rejects.toThrow(
        httpException,
      );
      expect(mockChatAgentsService.create).toHaveBeenCalledWith(
        mockCreateChatAgentDto,
      );
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockChatAgentsService.create.mockRejectedValue(unexpectedError);

      await expect(controller.create(mockCreateChatAgentDto)).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while creating chat agent',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockChatAgentsService.create).toHaveBeenCalledWith(
        mockCreateChatAgentDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all chat agents successfully', async () => {
      const mockChatAgents = [mockChatAgent];
      mockChatAgentsService.findMany.mockResolvedValue(mockChatAgents);

      const result = await controller.findAll();

      expect(mockChatAgentsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChatAgents);
    });

    it('should return chat agents with query parameters', async () => {
      const mockChatAgents = [mockChatAgent];
      mockChatAgentsService.findMany.mockResolvedValue(mockChatAgents);

      const result = await controller.findAll(5, 20, 'support', 'customer-1');

      expect(mockChatAgentsService.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 20,
        where: {
          AND: [
            { customerId: 'customer-1' },
            {
              OR: [
                { name: { contains: 'support', mode: 'insensitive' } },
                { description: { contains: 'support', mode: 'insensitive' } },
                { systemPrompt: { contains: 'support', mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChatAgents);
    });

    it('should return chat agents with only search parameter', async () => {
      const mockChatAgents = [mockChatAgent];
      mockChatAgentsService.findMany.mockResolvedValue(mockChatAgents);

      const result = await controller.findAll(undefined, undefined, 'support');

      expect(mockChatAgentsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          OR: [
            { name: { contains: 'support', mode: 'insensitive' } },
            { description: { contains: 'support', mode: 'insensitive' } },
            { systemPrompt: { contains: 'support', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChatAgents);
    });

    it('should return chat agents with only customerId parameter', async () => {
      const mockChatAgents = [mockChatAgent];
      mockChatAgentsService.findMany.mockResolvedValue(mockChatAgents);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        'customer-1',
      );

      expect(mockChatAgentsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: { customerId: 'customer-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChatAgents);
    });

    it('should throw HttpException when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatAgentsService.findMany.mockRejectedValue(unexpectedError);

      await expect(controller.findAll()).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching chat agents',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return a chat agent successfully', async () => {
      mockChatAgentsService.findOne.mockResolvedValue(mockChatAgent);

      const result = await controller.findOne('1');

      expect(mockChatAgentsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
      expect(result).toEqual(mockChatAgent);
    });

    it('should throw HttpException with NOT_FOUND when chat agent is not found', async () => {
      mockChatAgentsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException('Chat agent not found', HttpStatus.NOT_FOUND),
      );
      expect(mockChatAgentsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatAgentsService.findOne.mockRejectedValue(unexpectedError);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching chat agent',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockChatAgentsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
    });
  });

  describe('update', () => {
    it('should update a chat agent successfully', async () => {
      const updatedChatAgent = {
        ...mockChatAgent,
        name: 'Updated Support Bot',
      };
      mockChatAgentsService.update.mockResolvedValue(updatedChatAgent);

      const result = await controller.update('1', mockUpdateChatAgentDto);

      expect(mockChatAgentsService.update).toHaveBeenCalledWith(
        { id: '1' },
        mockUpdateChatAgentDto,
      );
      expect(result).toEqual(updatedChatAgent);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Chat agent not found',
        HttpStatus.CONFLICT,
      );
      mockChatAgentsService.update.mockRejectedValue(httpException);

      await expect(
        controller.update('1', mockUpdateChatAgentDto),
      ).rejects.toThrow(httpException);
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatAgentsService.update.mockRejectedValue(unexpectedError);

      await expect(
        controller.update('1', mockUpdateChatAgentDto),
      ).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while updating chat agent',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete a chat agent successfully', async () => {
      mockChatAgentsService.delete.mockResolvedValue(mockChatAgent);

      const result = await controller.remove('1');

      expect(mockChatAgentsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
      expect(result).toBeUndefined();
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Chat agent not found',
        HttpStatus.CONFLICT,
      );
      mockChatAgentsService.delete.mockRejectedValue(httpException);

      await expect(controller.remove('1')).rejects.toThrow(httpException);
      expect(mockChatAgentsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatAgentsService.delete.mockRejectedValue(unexpectedError);

      await expect(controller.remove('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while deleting chat agent',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockChatAgentsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
    });
  });
});
