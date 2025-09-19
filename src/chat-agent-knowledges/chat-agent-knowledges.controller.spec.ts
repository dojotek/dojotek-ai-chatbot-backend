import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChatAgentKnowledgesController } from './chat-agent-knowledges.controller';
import { ChatAgentKnowledgesService } from './chat-agent-knowledges.service';
import { CreateChatAgentKnowledgeDto } from './dto/create-chat-agent-knowledge.dto';
import { UpdateChatAgentKnowledgeDto } from './dto/update-chat-agent-knowledge.dto';
import { ChatAgentKnowledge } from './entities/chat-agent-knowledge.entity';

describe('ChatAgentKnowledgesController', () => {
  let controller: ChatAgentKnowledgesController;
  let service: jest.Mocked<ChatAgentKnowledgesService>;

  const mockChatAgentKnowledge: ChatAgentKnowledge = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    chatAgentId: '01234567-89ab-cdef-0123-456789abcdef',
    knowledgeId: '01234567-89ab-cdef-0123-456789abcdef',
    priority: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    chatAgent: {
      id: '01234567-89ab-cdef-0123-456789abcdef',
      customerId: '01234567-89ab-cdef-0123-456789abcdef',
      name: 'Test Chat Agent',
      description: 'Test Description',
      systemPrompt: 'Test System Prompt',
      config: {},
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    knowledge: {
      id: '01234567-89ab-cdef-0123-456789abcdef',
      name: 'Test Knowledge',
      description: 'Test Knowledge Description',
      category: 'Test Category',
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  };

  const mockCreateDto: CreateChatAgentKnowledgeDto = {
    chatAgentId: '01234567-89ab-cdef-0123-456789abcdef',
    knowledgeId: '01234567-89ab-cdef-0123-456789abcdef',
    priority: 1,
  };

  const mockUpdateDto: UpdateChatAgentKnowledgeDto = {
    priority: 2,
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findMany: jest.fn(),
      findByChatAgent: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatAgentKnowledgesController],
      providers: [
        {
          provide: ChatAgentKnowledgesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ChatAgentKnowledgesController>(
      ChatAgentKnowledgesController,
    );
    service = module.get(ChatAgentKnowledgesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a chat agent knowledge association', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockChatAgentKnowledge);

      const result = await controller.create(mockCreateDto);

      expect(jest.spyOn(service, 'create')).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockChatAgentKnowledge);
    });

    it('should throw ConflictException when service throws ConflictException', async () => {
      const error = new ConflictException(
        'This knowledge is already associated with the chat agent',
      );
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.create(mockCreateDto)).rejects.toThrow(
        'This knowledge is already associated with the chat agent',
      );
    });

    it('should throw InternalServerErrorException when service throws InternalServerErrorException', async () => {
      const error = new InternalServerErrorException(
        'Database operation failed',
      );
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(mockCreateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.create(mockCreateDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all chat agent knowledge associations without filters', async () => {
      jest
        .spyOn(service, 'findMany')
        .mockResolvedValue([mockChatAgentKnowledge]);

      const result = await controller.findAll();

      expect(jest.spyOn(service, 'findMany')).toHaveBeenCalledWith({
        where: {},
      });
      expect(result).toEqual([mockChatAgentKnowledge]);
    });

    it('should return filtered chat agent knowledge associations by chatAgentId', async () => {
      const chatAgentId = '01234567-89ab-cdef-0123-456789abcdef';
      jest
        .spyOn(service, 'findMany')
        .mockResolvedValue([mockChatAgentKnowledge]);

      const result = await controller.findAll(chatAgentId);

      expect(jest.spyOn(service, 'findMany')).toHaveBeenCalledWith({
        where: { chatAgentId },
      });
      expect(result).toEqual([mockChatAgentKnowledge]);
    });

    it('should return filtered chat agent knowledge associations by knowledgeId', async () => {
      const knowledgeId = '01234567-89ab-cdef-0123-456789abcdef';
      jest
        .spyOn(service, 'findMany')
        .mockResolvedValue([mockChatAgentKnowledge]);

      const result = await controller.findAll(undefined, knowledgeId);

      expect(jest.spyOn(service, 'findMany')).toHaveBeenCalledWith({
        where: { knowledgeId },
      });
      expect(result).toEqual([mockChatAgentKnowledge]);
    });

    it('should return filtered chat agent knowledge associations with pagination', async () => {
      const chatAgentId = '01234567-89ab-cdef-0123-456789abcdef';
      const skip = '0';
      const take = '10';
      jest
        .spyOn(service, 'findMany')
        .mockResolvedValue([mockChatAgentKnowledge]);

      const result = await controller.findAll(
        chatAgentId,
        undefined,
        skip,
        take,
      );

      expect(jest.spyOn(service, 'findMany')).toHaveBeenCalledWith({
        where: { chatAgentId },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual([mockChatAgentKnowledge]);
    });

    it('should return filtered chat agent knowledge associations with all filters', async () => {
      const chatAgentId = '01234567-89ab-cdef-0123-456789abcdef';
      const knowledgeId = '01234567-89ab-cdef-0123-456789abcdef';
      const skip = '0';
      const take = '10';
      jest
        .spyOn(service, 'findMany')
        .mockResolvedValue([mockChatAgentKnowledge]);

      const result = await controller.findAll(
        chatAgentId,
        knowledgeId,
        skip,
        take,
      );

      expect(jest.spyOn(service, 'findMany')).toHaveBeenCalledWith({
        where: { chatAgentId, knowledgeId },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual([mockChatAgentKnowledge]);
    });
  });

  describe('findByChatAgent', () => {
    it('should return chat agent knowledge associations for specific chat agent', async () => {
      const chatAgentId = '01234567-89ab-cdef-0123-456789abcdef';
      jest
        .spyOn(service, 'findByChatAgent')
        .mockResolvedValue([mockChatAgentKnowledge]);

      const result = await controller.findByChatAgent(chatAgentId);

      expect(jest.spyOn(service, 'findByChatAgent')).toHaveBeenCalledWith(
        chatAgentId,
      );
      expect(result).toEqual([mockChatAgentKnowledge]);
    });
  });

  describe('findOne', () => {
    it('should return a specific chat agent knowledge association', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      jest.spyOn(service, 'findOne').mockResolvedValue(mockChatAgentKnowledge);

      const result = await controller.findOne(id);

      expect(jest.spyOn(service, 'findOne')).toHaveBeenCalledWith({ id });
      expect(result).toEqual(mockChatAgentKnowledge);
    });

    it('should return null when chat agent knowledge association not found', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      const result = await controller.findOne(id);

      expect(jest.spyOn(service, 'findOne')).toHaveBeenCalledWith({ id });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a chat agent knowledge association', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      const updatedChatAgentKnowledge = {
        ...mockChatAgentKnowledge,
        priority: 2,
      };
      jest
        .spyOn(service, 'update')
        .mockResolvedValue(updatedChatAgentKnowledge);

      const result = await controller.update(id, mockUpdateDto);

      expect(jest.spyOn(service, 'update')).toHaveBeenCalledWith(
        { id },
        mockUpdateDto,
      );
      expect(result).toEqual(updatedChatAgentKnowledge);
    });

    it('should throw NotFoundException when service throws NotFoundException', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      const error = new NotFoundException(
        'Chat agent knowledge association not found',
      );
      jest.spyOn(service, 'update').mockRejectedValue(error);

      await expect(controller.update(id, mockUpdateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.update(id, mockUpdateDto)).rejects.toThrow(
        'Chat agent knowledge association not found',
      );
    });

    it('should throw InternalServerErrorException when service throws InternalServerErrorException', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      const error = new InternalServerErrorException(
        'Database operation failed',
      );
      jest.spyOn(service, 'update').mockRejectedValue(error);

      await expect(controller.update(id, mockUpdateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.update(id, mockUpdateDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('remove', () => {
    it('should remove a chat agent knowledge association', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      jest.spyOn(service, 'remove').mockResolvedValue(mockChatAgentKnowledge);

      await controller.remove(id);

      expect(jest.spyOn(service, 'remove')).toHaveBeenCalledWith({ id });
    });

    it('should throw NotFoundException when service throws NotFoundException', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      const error = new NotFoundException(
        'Chat agent knowledge association not found',
      );
      jest.spyOn(service, 'remove').mockRejectedValue(error);

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
      await expect(controller.remove(id)).rejects.toThrow(
        'Chat agent knowledge association not found',
      );
    });

    it('should throw InternalServerErrorException when service throws InternalServerErrorException', async () => {
      const id = '01234567-89ab-cdef-0123-456789abcdef';
      const error = new InternalServerErrorException(
        'Database operation failed',
      );
      jest.spyOn(service, 'remove').mockRejectedValue(error);

      await expect(controller.remove(id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.remove(id)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });
});
