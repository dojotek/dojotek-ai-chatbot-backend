import { Test, TestingModule } from '@nestjs/testing';
import { ChatSessionsService } from './chat-sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { ChatSession } from '../generated/prisma/client';

describe('ChatSessionsService', () => {
  let service: ChatSessionsService;

  const mockChatSession: ChatSession = {
    id: 'test-uuid-123',
    chatAgentId: 'test-chat-agent-id',
    customerStaffId: 'test-customer-staff-id',
    platform: 'slack',
    platformThreadId: 'C1234567890',
    sessionData: { conversationContext: 'ongoing_support' },
    status: 'active',
    expiresAt: new Date('2023-12-31T23:59:59.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    chatSession: {
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
    cachePrefixChatSessions: 'chat-sessions',
    cacheTtlChatSessions: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatSessionsService,
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

    service = module.get<ChatSessionsService>(ChatSessionsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached chat session when found in cache', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockChatSession);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockChatSession);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'chat-sessions:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.chatSession.findUnique).not.toHaveBeenCalled();
    });

    it('should return chat session from database when not in cache', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockChatSession);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'chat-sessions:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.chatSession.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-sessions:findOne:id:test-uuid-123',
        mockChatSession,
        3600,
      );
    });

    it('should return null when chat session not found', async () => {
      const whereInput = { id: 'non-existent-id' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatSession.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createChatSessionDto: CreateChatSessionDto = {
      chatAgentId: 'test-chat-agent-id',
      customerStaffId: 'test-customer-staff-id',
      platform: 'slack',
      platformThreadId: 'C1234567890',
      sessionData: { conversationContext: 'ongoing_support' },
      status: 'active',
      expiresAt: '2023-12-31T23:59:59.000Z',
    };

    it('should create a chat session and cache it', async () => {
      mockCachesService.set.mockResolvedValue('OK');
      mockPrismaService.chatSession.create.mockResolvedValue(mockChatSession);

      const result = await service.create(createChatSessionDto);

      expect(result).toEqual(mockChatSession);
      expect(mockPrismaService.chatSession.create).toHaveBeenCalledWith({
        data: {
          platform: 'slack',
          platformThreadId: 'C1234567890',
          sessionData: { conversationContext: 'ongoing_support' },
          status: 'active',
          expiresAt: new Date('2023-12-31T23:59:59.000Z'),
          chatAgent: {
            connect: {
              id: 'test-chat-agent-id',
            },
          },
          customerStaff: {
            connect: {
              id: 'test-customer-staff-id',
            },
          },
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-sessions:findOne:id:test-uuid-123',
        mockChatSession,
        3600,
      );
    });
  });

  describe('findMany', () => {
    it('should return chat sessions with given parameters', async () => {
      const params = {
        skip: 0,
        take: 10,
        where: { platform: 'slack' },
        orderBy: { createdAt: 'desc' as const },
      };
      const mockChatSessions = [mockChatSession];
      mockPrismaService.chatSession.findMany.mockResolvedValue(
        mockChatSessions,
      );

      const result = await service.findMany(params);

      expect(result).toEqual(mockChatSessions);
      expect(mockPrismaService.chatSession.findMany).toHaveBeenCalledWith(
        params,
      );
    });
  });

  describe('update', () => {
    const updateData = {
      status: 'closed',
      sessionData: { reason: 'user_ended_session' },
    };

    it('should update a chat session and cache it', async () => {
      const updatedChatSession = { ...mockChatSession, ...updateData };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.update.mockResolvedValue(
        updatedChatSession,
      );
      mockCachesService.del.mockResolvedValue(1);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update({ id: 'test-uuid-123' }, updateData);

      expect(result).toEqual(updatedChatSession);
      expect(mockPrismaService.chatSession.update).toHaveBeenCalledWith({
        data: updateData,
        where: { id: 'test-uuid-123' },
      });
    });
  });

  describe('delete', () => {
    it('should delete a chat session and invalidate cache', async () => {
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.delete.mockResolvedValue(mockChatSession);
      mockCachesService.del.mockResolvedValue(1);

      const result = await service.delete({ id: 'test-uuid-123' });

      expect(result).toEqual(mockChatSession);
      expect(mockPrismaService.chatSession.delete).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
      });
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'chat-sessions:findOne:id:test-uuid-123',
      );
    });
  });
});
