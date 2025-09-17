import { Test, TestingModule } from '@nestjs/testing';
import { ChatSessionsService } from './chat-sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { ChatSession } from '../generated/prisma/client';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

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
      findFirst: jest.fn(),
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
    inboundChatSessionTtlSample: 7200,
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

    it('should handle Prisma P2002 error (unique constraint violation)', async () => {
      const error = {
        code: 'P2002',
        meta: { target: ['platform'] },
      };
      mockPrismaService.chatSession.create.mockRejectedValue(error);

      await expect(service.create(createChatSessionDto)).rejects.toThrow(
        new ConflictException('platform already exists'),
      );
    });

    it('should handle Prisma P2003 error (foreign key constraint)', async () => {
      const error = {
        code: 'P2003',
        meta: {},
      };
      mockPrismaService.chatSession.create.mockRejectedValue(error);

      await expect(service.create(createChatSessionDto)).rejects.toThrow(
        new ConflictException('Chat agent or customer staff not found'),
      );
    });

    it('should handle other Prisma errors', async () => {
      const error = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.chatSession.create.mockRejectedValue(error);

      await expect(service.create(createChatSessionDto)).rejects.toThrow(
        new InternalServerErrorException('Database operation failed'),
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const error = new Error('Network error');
      mockPrismaService.chatSession.create.mockRejectedValue(error);

      await expect(service.create(createChatSessionDto)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle Prisma P2002 error with missing meta target', async () => {
      const error = {
        code: 'P2002',
        meta: {},
      };
      mockPrismaService.chatSession.create.mockRejectedValue(error);

      await expect(service.create(createChatSessionDto)).rejects.toThrow(
        new ConflictException('field already exists'),
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

    it('should update with chatAgentId and customerStaffId', async () => {
      const updateDataWithIds: UpdateChatSessionDto = {
        chatAgentId: 'new-chat-agent-id',
        customerStaffId: 'new-customer-staff-id',
        expiresAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
      };
      const updatedChatSession = { ...mockChatSession, ...updateDataWithIds };

      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.update.mockResolvedValue(
        updatedChatSession,
      );
      mockCachesService.del.mockResolvedValue(1);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update(
        { id: 'test-uuid-123' },
        updateDataWithIds,
      );

      expect(result).toEqual(updatedChatSession);
      expect(mockPrismaService.chatSession.update).toHaveBeenCalledWith({
        data: {
          status: 'active',
          expiresAt: new Date('2024-01-01T00:00:00.000Z'),
          chatAgent: {
            connect: {
              id: 'new-chat-agent-id',
            },
          },
          customerStaff: {
            connect: {
              id: 'new-customer-staff-id',
            },
          },
        },
        where: { id: 'test-uuid-123' },
      });
    });

    it('should handle Prisma P2002 error during update', async () => {
      const error = {
        code: 'P2002',
        meta: { target: ['platform'] },
      };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.update.mockRejectedValue(error);

      await expect(
        service.update({ id: 'test-uuid-123' }, updateData),
      ).rejects.toThrow(new ConflictException('platform already exists'));
    });

    it('should handle Prisma P2025 error (record not found)', async () => {
      const error = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.update.mockRejectedValue(error);

      await expect(
        service.update({ id: 'test-uuid-123' }, updateData),
      ).rejects.toThrow(new ConflictException('Chat session not found'));
    });

    it('should handle Prisma P2003 error during update', async () => {
      const error = {
        code: 'P2003',
        meta: {},
      };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.update.mockRejectedValue(error);

      await expect(
        service.update({ id: 'test-uuid-123' }, updateData),
      ).rejects.toThrow(
        new ConflictException('Chat agent or customer staff not found'),
      );
    });

    it('should handle other Prisma errors during update', async () => {
      const error = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.update.mockRejectedValue(error);

      await expect(
        service.update({ id: 'test-uuid-123' }, updateData),
      ).rejects.toThrow(
        new InternalServerErrorException('Database operation failed'),
      );
    });

    it('should re-throw non-Prisma errors during update', async () => {
      const error = new Error('Network error');
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.update.mockRejectedValue(error);

      await expect(
        service.update({ id: 'test-uuid-123' }, updateData),
      ).rejects.toThrow('Network error');
    });

    it('should handle update when no existing session found', async () => {
      const updatedChatSession = { ...mockChatSession, ...updateData };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(null);
      mockPrismaService.chatSession.update.mockResolvedValue(
        updatedChatSession,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update({ id: 'test-uuid-123' }, updateData);

      expect(result).toEqual(updatedChatSession);
      expect(mockCachesService.del).not.toHaveBeenCalled();
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

    it('should handle Prisma P2025 error during delete', async () => {
      const error = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.delete.mockRejectedValue(error);

      await expect(service.delete({ id: 'test-uuid-123' })).rejects.toThrow(
        new ConflictException('Chat session not found'),
      );
    });

    it('should handle other Prisma errors during delete', async () => {
      const error = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.delete.mockRejectedValue(error);

      await expect(service.delete({ id: 'test-uuid-123' })).rejects.toThrow(
        new InternalServerErrorException('Database operation failed'),
      );
    });

    it('should re-throw non-Prisma errors during delete', async () => {
      const error = new Error('Network error');
      mockPrismaService.chatSession.findUnique.mockResolvedValue(
        mockChatSession,
      );
      mockPrismaService.chatSession.delete.mockRejectedValue(error);

      await expect(service.delete({ id: 'test-uuid-123' })).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getInboundChatSessionId', () => {
    const chatAgentId = 'test-chat-agent-id';
    const customerId = 'test-customer-id';
    const customerStaffId = 'test-customer-staff-id';
    const platform = 'slack';

    it('should return cached session ID when found in cache', async () => {
      const cachedSessionId = 'cached-session-id';
      mockCachesService.get.mockResolvedValue(cachedSessionId);

      const result = await service.getInboundChatSessionId(
        chatAgentId,
        customerId,
        customerStaffId,
        platform,
      );

      expect(result).toBe(cachedSessionId);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'chat-sessions:inbound:test-chat-agent-id:test-customer-id:test-customer-staff-id:slack',
      );
      expect(mockPrismaService.chatSession.findFirst).not.toHaveBeenCalled();
    });

    it('should return existing session ID when found in database', async () => {
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatSession.findFirst.mockResolvedValue(
        mockChatSession,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.getInboundChatSessionId(
        chatAgentId,
        customerId,
        customerStaffId,
        platform,
      );

      expect(result).toBe(mockChatSession.id);
      expect(mockPrismaService.chatSession.findFirst).toHaveBeenCalledWith({
        where: {
          chatAgentId,
          customerStaffId,
          platform,
          expiresAt: {
            gt: expect.any(Date) as Date,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-sessions:inbound:test-chat-agent-id:test-customer-id:test-customer-staff-id:slack',
        mockChatSession.id,
        7200,
      );
    });

    it('should create new session when none exists', async () => {
      const newSession = { ...mockChatSession, id: 'new-session-id' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatSession.findFirst.mockResolvedValue(null);
      mockPrismaService.chatSession.create.mockResolvedValue(newSession);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.getInboundChatSessionId(
        chatAgentId,
        customerId,
        customerStaffId,
        platform,
      );

      expect(result).toBe('new-session-id');
      expect(mockPrismaService.chatSession.create).toHaveBeenCalledWith({
        data: {
          chatAgentId,
          customerStaffId,
          platform,
          expiresAt: expect.any(Date) as Date,
          status: 'active',
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-sessions:inbound:test-chat-agent-id:test-customer-id:test-customer-staff-id:slack',
        'new-session-id',
        7200,
      );
    });
  });
});
