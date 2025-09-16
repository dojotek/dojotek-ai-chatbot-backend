import { Test, TestingModule } from '@nestjs/testing';
import { ChatMessagesService } from './chat-messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import {
  CreateChatMessageDto,
  MessageType,
} from './dto/create-chat-message.dto';
import { ChatMessage } from '../generated/prisma/client';

describe('ChatMessagesService', () => {
  let service: ChatMessagesService;

  const mockChatMessage: ChatMessage = {
    id: 'test-uuid-123',
    chatSessionId: 'test-session-id',
    messageType: 'user',
    content: 'Hello, how can I help you?',
    metadata: { attachments: [] },
    platformMessageId: 'slack_msg_123',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    chatMessage: {
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
    cachePrefixChatMessages: 'chat-messages',
    cacheTtlChatMessages: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMessagesService,
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

    service = module.get<ChatMessagesService>(ChatMessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached chat message if exists', async () => {
      mockCachesService.get.mockResolvedValue(mockChatMessage);

      const result = await service.findOne({ id: 'test-uuid-123' });

      expect(result).toEqual(mockChatMessage);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'chat-messages:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.chatMessage.findUnique).not.toHaveBeenCalled();
    });

    it('should return chat message from database and cache it', async () => {
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatMessage.findUnique.mockResolvedValue(
        mockChatMessage,
      );

      const result = await service.findOne({ id: 'test-uuid-123' });

      expect(result).toEqual(mockChatMessage);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'chat-messages:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.chatMessage.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-messages:findOne:id:test-uuid-123',
        mockChatMessage,
        3600,
      );
    });

    it('should return null if chat message not found', async () => {
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatMessage.findUnique.mockResolvedValue(null);

      const result = await service.findOne({ id: 'non-existent' });

      expect(result).toBeNull();
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return chat messages from database', async () => {
      const mockChatMessages = [mockChatMessage];
      mockPrismaService.chatMessage.findMany.mockResolvedValue(
        mockChatMessages,
      );

      const result = await service.findMany({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockChatMessages);
      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        cursor: undefined,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    const createChatMessageDto: CreateChatMessageDto = {
      chatSessionId: 'test-session-id',
      messageType: MessageType.USER,
      content: 'Hello, how can I help you?',
      metadata: { attachments: [] },
      platformMessageId: 'slack_msg_123',
    };

    it('should create and cache a new chat message', async () => {
      mockPrismaService.chatMessage.create.mockResolvedValue(mockChatMessage);

      const result = await service.create(createChatMessageDto);

      expect(result).toEqual(mockChatMessage);
      expect(mockPrismaService.chatMessage.create).toHaveBeenCalledWith({
        data: {
          messageType: MessageType.USER,
          content: 'Hello, how can I help you?',
          metadata: { attachments: [] },
          platformMessageId: 'slack_msg_123',
          chatSession: {
            connect: {
              id: 'test-session-id',
            },
          },
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-messages:findOne:id:test-uuid-123',
        mockChatMessage,
        3600,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      content: 'Updated message',
      messageType: MessageType.AI,
    };

    it('should update and cache the chat message', async () => {
      const updatedChatMessage = { ...mockChatMessage, ...updateDto };
      mockPrismaService.chatMessage.findUnique.mockResolvedValue(
        mockChatMessage,
      );
      mockPrismaService.chatMessage.update.mockResolvedValue(
        updatedChatMessage,
      );

      const result = await service.update({ id: 'test-uuid-123' }, updateDto);

      expect(result).toEqual(updatedChatMessage);
      expect(mockPrismaService.chatMessage.update).toHaveBeenCalledWith({
        data: updateDto,
        where: { id: 'test-uuid-123' },
      });
      expect(mockCachesService.del).toHaveBeenCalled();
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-messages:findOne:id:test-uuid-123',
        updatedChatMessage,
        3600,
      );
    });
  });

  describe('delete', () => {
    it('should delete and invalidate cache for the chat message', async () => {
      mockPrismaService.chatMessage.findUnique.mockResolvedValue(
        mockChatMessage,
      );
      mockPrismaService.chatMessage.delete.mockResolvedValue(mockChatMessage);

      const result = await service.delete({ id: 'test-uuid-123' });

      expect(result).toEqual(mockChatMessage);
      expect(mockPrismaService.chatMessage.delete).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
      });
      expect(mockCachesService.del).toHaveBeenCalled();
    });
  });
});
