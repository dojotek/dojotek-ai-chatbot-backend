import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatMessagesController } from './chat-messages.controller';
import { ChatMessagesService } from './chat-messages.service';
import {
  CreateChatMessageDto,
  MessageType,
} from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';

describe('ChatMessagesController', () => {
  let controller: ChatMessagesController;

  const mockChatMessage = {
    id: '1',
    chatSessionId: 'session-1',
    messageType: 'user',
    content: 'Hello, how can I help you?',
    metadata: { attachments: [] },
    platformMessageId: 'slack_msg_123',
    createdAt: new Date(),
  };

  const mockCreateChatMessageDto: CreateChatMessageDto = {
    chatSessionId: 'session-1',
    messageType: MessageType.USER,
    content: 'Hello, how can I help you?',
    metadata: { attachments: [] },
    platformMessageId: 'slack_msg_123',
  };

  const mockUpdateChatMessageDto: UpdateChatMessageDto = {
    content: 'Updated message content',
    messageType: MessageType.AI,
  };

  const mockChatMessagesService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatMessagesController],
      providers: [
        {
          provide: ChatMessagesService,
          useValue: mockChatMessagesService,
        },
      ],
    }).compile();

    controller = module.get<ChatMessagesController>(ChatMessagesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a chat message successfully', async () => {
      mockChatMessagesService.create.mockResolvedValue(mockChatMessage);

      const result = await controller.create(mockCreateChatMessageDto);

      expect(result).toEqual(mockChatMessage);
      expect(mockChatMessagesService.create).toHaveBeenCalledWith(
        mockCreateChatMessageDto,
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockChatMessagesService.create.mockRejectedValue(error);

      await expect(controller.create(mockCreateChatMessageDto)).rejects.toThrow(
        HttpException,
      );
    });

    it('should re-throw HTTP exceptions', async () => {
      const httpError = new HttpException(
        'Chat session not found',
        HttpStatus.CONFLICT,
      );
      mockChatMessagesService.create.mockRejectedValue(httpError);

      await expect(controller.create(mockCreateChatMessageDto)).rejects.toThrow(
        httpError,
      );
    });
  });

  describe('findAll', () => {
    it('should return all chat messages', async () => {
      const mockChatMessages = [mockChatMessage];
      mockChatMessagesService.findMany.mockResolvedValue(mockChatMessages);

      const result = await controller.findAll();

      expect(result).toEqual(mockChatMessages);
      expect(mockChatMessagesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 50,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return chat messages with pagination', async () => {
      const mockChatMessages = [mockChatMessage];
      mockChatMessagesService.findMany.mockResolvedValue(mockChatMessages);

      const result = await controller.findAll(0, 10);

      expect(result).toEqual(mockChatMessages);
      expect(mockChatMessagesService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return chat messages with filters', async () => {
      const mockChatMessages = [mockChatMessage];
      mockChatMessagesService.findMany.mockResolvedValue(mockChatMessages);

      const result = await controller.findAll(
        undefined,
        undefined,
        'hello',
        'session-1',
        'user',
      );

      expect(result).toEqual(mockChatMessages);
      expect(mockChatMessagesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 50,
        where: {
          AND: [
            { chatSessionId: 'session-1', messageType: 'user' },
            {
              OR: [
                { content: { contains: 'hello', mode: 'insensitive' } },
                { messageType: { contains: 'hello', mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockChatMessagesService.findMany.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(HttpException);
    });
  });

  describe('findOne', () => {
    it('should return a chat message by id', async () => {
      mockChatMessagesService.findOne.mockResolvedValue(mockChatMessage);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockChatMessage);
      expect(mockChatMessagesService.findOne).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw NotFoundException when chat message not found', async () => {
      mockChatMessagesService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('999')).rejects.toThrow(
        new HttpException('Chat message not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockChatMessagesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('1')).rejects.toThrow(HttpException);
    });
  });

  describe('update', () => {
    it('should update a chat message successfully', async () => {
      const updatedChatMessage = {
        ...mockChatMessage,
        ...mockUpdateChatMessageDto,
      };
      mockChatMessagesService.update.mockResolvedValue(updatedChatMessage);

      const result = await controller.update('1', mockUpdateChatMessageDto);

      expect(result).toEqual(updatedChatMessage);
      expect(mockChatMessagesService.update).toHaveBeenCalledWith(
        { id: '1' },
        mockUpdateChatMessageDto,
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockChatMessagesService.update.mockRejectedValue(error);

      await expect(
        controller.update('1', mockUpdateChatMessageDto),
      ).rejects.toThrow(HttpException);
    });

    it('should re-throw HTTP exceptions', async () => {
      const httpError = new HttpException(
        'Chat message not found',
        HttpStatus.CONFLICT,
      );
      mockChatMessagesService.update.mockRejectedValue(httpError);

      await expect(
        controller.update('1', mockUpdateChatMessageDto),
      ).rejects.toThrow(httpError);
    });
  });

  describe('remove', () => {
    it('should delete a chat message successfully', async () => {
      mockChatMessagesService.delete.mockResolvedValue(mockChatMessage);

      await controller.remove('1');

      expect(mockChatMessagesService.delete).toHaveBeenCalledWith({ id: '1' });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockChatMessagesService.delete.mockRejectedValue(error);

      await expect(controller.remove('1')).rejects.toThrow(HttpException);
    });

    it('should re-throw HTTP exceptions', async () => {
      const httpError = new HttpException(
        'Chat message not found',
        HttpStatus.CONFLICT,
      );
      mockChatMessagesService.delete.mockRejectedValue(httpError);

      await expect(controller.remove('1')).rejects.toThrow(httpError);
    });
  });
});
