import { Test, TestingModule } from '@nestjs/testing';
import { ChatAgentsService } from './chat-agents.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateChatAgentDto } from './dto/create-chat-agent.dto';
import { ChatAgent } from '../generated/prisma/client';

describe('ChatAgentsService', () => {
  let service: ChatAgentsService;

  const mockChatAgent: ChatAgent = {
    id: 'test-uuid-123',
    customerId: 'test-customer-id',
    name: 'Customer Support Bot',
    description: 'An AI assistant for customer support inquiries',
    systemPrompt:
      'You are a helpful customer support assistant. Always be polite and professional.',
    config: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    chatAgent: {
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
    cachePrefixChatAgents: 'chat-agents',
    cacheTtlChatAgents: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatAgentsService,
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

    service = module.get<ChatAgentsService>(ChatAgentsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached chat agent when found in cache', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockChatAgent);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockChatAgent);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'chat-agents:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.chatAgent.findUnique).not.toHaveBeenCalled();
    });

    it('should return chat agent from database when not in cache', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatAgent.findUnique.mockResolvedValue(mockChatAgent);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockChatAgent);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'chat-agents:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.chatAgent.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-agents:findOne:id:test-uuid-123',
        mockChatAgent,
        3600,
      );
    });

    it('should return null when chat agent is not found', async () => {
      const whereInput = { id: 'non-existent-id' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.chatAgent.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return multiple chat agents', async () => {
      const mockChatAgents = [mockChatAgent];
      const params = {
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' as const },
      };
      mockPrismaService.chatAgent.findMany.mockResolvedValue(mockChatAgents);

      const result = await service.findMany(params);

      expect(result).toEqual(mockChatAgents);
      expect(mockPrismaService.chatAgent.findMany).toHaveBeenCalledWith(params);
    });
  });

  describe('create', () => {
    const createChatAgentDto: CreateChatAgentDto = {
      customerId: 'test-customer-id',
      name: 'Customer Support Bot',
      description: 'An AI assistant for customer support inquiries',
      systemPrompt:
        'You are a helpful customer support assistant. Always be polite and professional.',
      config: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 },
      isActive: true,
    };

    it('should create a chat agent and cache it', async () => {
      mockCachesService.set.mockResolvedValue('OK');
      mockPrismaService.chatAgent.create.mockResolvedValue(mockChatAgent);

      const result = await service.create(createChatAgentDto);

      expect(result).toEqual(mockChatAgent);
      expect(mockPrismaService.chatAgent.create).toHaveBeenCalledWith({
        data: {
          name: 'Customer Support Bot',
          description: 'An AI assistant for customer support inquiries',
          systemPrompt:
            'You are a helpful customer support assistant. Always be polite and professional.',
          config: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 },
          isActive: true,
          customer: {
            connect: {
              id: 'test-customer-id',
            },
          },
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'chat-agents:findOne:id:test-uuid-123',
        mockChatAgent,
        3600,
      );
    });

    it('should throw ConflictException when customer not found', async () => {
      const prismaError = {
        code: 'P2003',
        meta: { target: ['customerId'] },
      };
      mockPrismaService.chatAgent.create.mockRejectedValue(prismaError);

      await expect(service.create(createChatAgentDto)).rejects.toThrow(
        'Customer not found',
      );
    });
  });

  describe('update', () => {
    const updateChatAgentDto = {
      name: 'Updated Support Bot',
      description: 'Updated description',
    };

    it('should update a chat agent and handle cache', async () => {
      const existingChatAgent = { ...mockChatAgent };
      const updatedChatAgent = { ...mockChatAgent, ...updateChatAgentDto };

      mockPrismaService.chatAgent.findUnique.mockResolvedValue(
        existingChatAgent,
      );
      mockPrismaService.chatAgent.update.mockResolvedValue(updatedChatAgent);
      mockCachesService.del.mockResolvedValue(1);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update(
        { id: 'test-uuid-123' },
        updateChatAgentDto,
      );

      expect(result).toEqual(updatedChatAgent);
      expect(mockPrismaService.chatAgent.update).toHaveBeenCalledWith({
        data: updateChatAgentDto,
        where: { id: 'test-uuid-123' },
      });
    });

    it('should throw ConflictException when chat agent not found', async () => {
      const prismaError = {
        code: 'P2025',
      };
      mockPrismaService.chatAgent.findUnique.mockResolvedValue(null);
      mockPrismaService.chatAgent.update.mockRejectedValue(prismaError);

      await expect(
        service.update({ id: 'non-existent-id' }, updateChatAgentDto),
      ).rejects.toThrow('Chat agent not found');
    });
  });

  describe('delete', () => {
    it('should delete a chat agent and invalidate cache', async () => {
      const chatAgentToDelete = { ...mockChatAgent };

      mockPrismaService.chatAgent.findUnique.mockResolvedValue(
        chatAgentToDelete,
      );
      mockPrismaService.chatAgent.delete.mockResolvedValue(chatAgentToDelete);
      mockCachesService.del.mockResolvedValue(1);

      const result = await service.delete({ id: 'test-uuid-123' });

      expect(result).toEqual(chatAgentToDelete);
      expect(mockPrismaService.chatAgent.delete).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
      });
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'chat-agents:findOne:id:test-uuid-123',
      );
    });

    it('should throw ConflictException when chat agent not found', async () => {
      const prismaError = {
        code: 'P2025',
      };
      mockPrismaService.chatAgent.findUnique.mockResolvedValue(null);
      mockPrismaService.chatAgent.delete.mockRejectedValue(prismaError);

      await expect(service.delete({ id: 'non-existent-id' })).rejects.toThrow(
        'Chat agent not found',
      );
    });
  });
});
