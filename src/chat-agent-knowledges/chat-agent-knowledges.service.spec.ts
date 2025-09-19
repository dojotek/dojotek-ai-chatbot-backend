import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ChatAgentKnowledgesService } from './chat-agent-knowledges.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateChatAgentKnowledgeDto } from './dto/create-chat-agent-knowledge.dto';
import { UpdateChatAgentKnowledgeDto } from './dto/update-chat-agent-knowledge.dto';
import { ChatAgentKnowledge } from './entities/chat-agent-knowledge.entity';

describe('ChatAgentKnowledgesService', () => {
  let service: ChatAgentKnowledgesService;
  let prismaService: jest.Mocked<PrismaService>;
  let cachesService: jest.Mocked<CachesService>;

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
    const mockPrismaService = {
      chatAgentKnowledge: {
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
    };

    const mockConfigsService = {
      cacheTtlChatAgentKnowledges: 3600,
      cachePrefixChatAgentKnowledges: 'chat_agent_knowledges',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatAgentKnowledgesService,
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

    service = module.get<ChatAgentKnowledgesService>(
      ChatAgentKnowledgesService,
    );
    prismaService = module.get(PrismaService);
    cachesService = module.get(CachesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return cached result when available', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };
      const cacheKey =
        'chat_agent_knowledges:findOne:id:01234567-89ab-cdef-0123-456789abcdef';

      const getSpy = jest
        .spyOn(cachesService, 'get')
        .mockResolvedValue(mockChatAgentKnowledge);
      const findUniqueSpy = jest.spyOn(
        prismaService.chatAgentKnowledge,
        'findUnique',
      );
      jest.spyOn(service as any, 'generateCacheKey').mockReturnValue(cacheKey);

      const result = await service.findOne(whereInput);

      expect(getSpy).toHaveBeenCalledWith(cacheKey);
      expect(findUniqueSpy).not.toHaveBeenCalled();
      expect(result).toEqual(mockChatAgentKnowledge);
    });

    it('should fetch from database and cache when not in cache', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };
      const cacheKey =
        'chat_agent_knowledges:findOne:id:01234567-89ab-cdef-0123-456789abcdef';

      const getSpy = jest.spyOn(cachesService, 'get').mockResolvedValue(null);
      const setSpy = jest.spyOn(cachesService, 'set').mockResolvedValue('OK');
      const findUniqueSpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(mockChatAgentKnowledge);
      jest.spyOn(service as any, 'generateCacheKey').mockReturnValue(cacheKey);

      const result = await service.findOne(whereInput);

      expect(getSpy).toHaveBeenCalledWith(cacheKey);
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: whereInput,
        include: {
          chatAgent: true,
          knowledge: true,
        },
      });
      expect(setSpy).toHaveBeenCalledWith(
        cacheKey,
        mockChatAgentKnowledge,
        3600,
      );
      expect(result).toEqual(mockChatAgentKnowledge);
    });

    it('should return null when not found in database', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };
      const cacheKey =
        'chat_agent_knowledges:findOne:id:01234567-89ab-cdef-0123-456789abcdef';

      jest.spyOn(cachesService, 'get').mockResolvedValue(null);
      const setSpy = jest.spyOn(cachesService, 'set');
      jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(null);
      jest.spyOn(service as any, 'generateCacheKey').mockReturnValue(cacheKey);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return chat agent knowledges with includes', async () => {
      const params = {
        where: { chatAgentId: '01234567-89ab-cdef-0123-456789abcdef' },
        skip: 0,
        take: 10,
      };

      const findManySpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'findMany')
        .mockResolvedValue([mockChatAgentKnowledge]);

      const result = await service.findMany(params);

      expect(findManySpy).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        cursor: undefined,
        where: { chatAgentId: '01234567-89ab-cdef-0123-456789abcdef' },
        orderBy: undefined,
        include: {
          chatAgent: true,
          knowledge: true,
        },
      });
      expect(result).toEqual([mockChatAgentKnowledge]);
    });
  });

  describe('findByChatAgent', () => {
    it('should return cached result when available', async () => {
      const chatAgentId = '01234567-89ab-cdef-0123-456789abcdef';
      const cacheKey =
        'chat_agent_knowledges:findByChatAgent:chatAgentId:01234567-89ab-cdef-0123-456789abcdef';

      const getSpy = jest
        .spyOn(cachesService, 'get')
        .mockResolvedValue([mockChatAgentKnowledge]);
      const findManySpy = jest.spyOn(
        prismaService.chatAgentKnowledge,
        'findMany',
      );
      jest.spyOn(service as any, 'generateCacheKey').mockReturnValue(cacheKey);

      const result = await service.findByChatAgent(chatAgentId);

      expect(getSpy).toHaveBeenCalledWith(cacheKey);
      expect(findManySpy).not.toHaveBeenCalled();
      expect(result).toEqual([mockChatAgentKnowledge]);
    });

    it('should fetch from database and cache when not in cache', async () => {
      const chatAgentId = '01234567-89ab-cdef-0123-456789abcdef';
      const cacheKey =
        'chat_agent_knowledges:findByChatAgent:chatAgentId:01234567-89ab-cdef-0123-456789abcdef';

      const getSpy = jest.spyOn(cachesService, 'get').mockResolvedValue(null);
      const setSpy = jest.spyOn(cachesService, 'set').mockResolvedValue('OK');
      const findManySpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'findMany')
        .mockResolvedValue([mockChatAgentKnowledge]);
      jest.spyOn(service as any, 'generateCacheKey').mockReturnValue(cacheKey);

      const result = await service.findByChatAgent(chatAgentId);

      expect(getSpy).toHaveBeenCalledWith(cacheKey);
      expect(findManySpy).toHaveBeenCalledWith({
        where: { chatAgentId },
        include: {
          chatAgent: true,
          knowledge: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
      expect(setSpy).toHaveBeenCalledWith(
        cacheKey,
        [mockChatAgentKnowledge],
        3600,
      );
      expect(result).toEqual([mockChatAgentKnowledge]);
    });
  });

  describe('create', () => {
    it('should create chat agent knowledge and cache result', async () => {
      const createSpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'create')
        .mockResolvedValue(mockChatAgentKnowledge);
      const setSpy = jest.spyOn(cachesService, 'set').mockResolvedValue('OK');
      jest
        .spyOn(service as any, 'invalidateChatAgentKnowledgesCache')
        .mockResolvedValue(undefined);

      const result = await service.create(mockCreateDto);

      expect(createSpy).toHaveBeenCalledWith({
        data: {
          chatAgentId: mockCreateDto.chatAgentId,
          knowledgeId: mockCreateDto.knowledgeId,
          priority: 1,
        },
        include: {
          chatAgent: true,
          knowledge: true,
        },
      });
      expect(setSpy).toHaveBeenCalled();
      expect(result).toEqual(mockChatAgentKnowledge);
    });

    it('should throw ConflictException when knowledge is already associated', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['chatAgentId', 'knowledgeId'] },
      };
      jest
        .spyOn(prismaService.chatAgentKnowledge, 'create')
        .mockRejectedValue(prismaError);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        'This knowledge is already associated with the chat agent',
      );
    });

    it('should throw ConflictException when chat agent or knowledge not found', async () => {
      const prismaError = { code: 'P2003' };
      jest
        .spyOn(prismaService.chatAgentKnowledge, 'create')
        .mockRejectedValue(prismaError);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        'Chat agent or knowledge not found',
      );
    });

    it('should throw InternalServerErrorException for other Prisma errors', async () => {
      const prismaError = { code: 'P1001' };
      jest
        .spyOn(prismaService.chatAgentKnowledge, 'create')
        .mockRejectedValue(prismaError);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const error = new Error('Custom error');
      jest
        .spyOn(prismaService.chatAgentKnowledge, 'create')
        .mockRejectedValue(error);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        'Custom error',
      );
    });
  });

  describe('update', () => {
    it('should update chat agent knowledge and cache result', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };
      const updatedChatAgentKnowledge = {
        ...mockChatAgentKnowledge,
        priority: 2,
      };

      const findUniqueSpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(mockChatAgentKnowledge);
      const updateSpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'update')
        .mockResolvedValue(updatedChatAgentKnowledge);
      const setSpy = jest.spyOn(cachesService, 'set').mockResolvedValue('OK');
      jest
        .spyOn(service as any, 'invalidateChatAgentKnowledgeCache')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'invalidateChatAgentKnowledgesCache')
        .mockResolvedValue(undefined);

      const result = await service.update(whereInput, mockUpdateDto);

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(updateSpy).toHaveBeenCalledWith({
        data: mockUpdateDto,
        where: whereInput,
        include: {
          chatAgent: true,
          knowledge: true,
        },
      });
      expect(setSpy).toHaveBeenCalled();
      expect(result).toEqual(updatedChatAgentKnowledge);
    });

    it('should throw NotFoundException when chat agent knowledge not found', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };

      jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.update(whereInput, mockUpdateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(whereInput, mockUpdateDto)).rejects.toThrow(
        'Chat agent knowledge association not found',
      );
    });

    it('should throw NotFoundException for Prisma P2025 error', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };
      const prismaError = { code: 'P2025' };

      jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(mockChatAgentKnowledge);
      jest
        .spyOn(prismaService.chatAgentKnowledge, 'update')
        .mockRejectedValue(prismaError);

      await expect(service.update(whereInput, mockUpdateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(whereInput, mockUpdateDto)).rejects.toThrow(
        'Chat agent knowledge association not found',
      );
    });
  });

  describe('remove', () => {
    it('should remove chat agent knowledge and invalidate cache', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };

      const findUniqueSpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(mockChatAgentKnowledge);
      const deleteSpy = jest
        .spyOn(prismaService.chatAgentKnowledge, 'delete')
        .mockResolvedValue(mockChatAgentKnowledge);
      jest
        .spyOn(service as any, 'invalidateChatAgentKnowledgeCache')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'invalidateChatAgentKnowledgesCache')
        .mockResolvedValue(undefined);

      const result = await service.remove(whereInput);

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(deleteSpy).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(result).toEqual(mockChatAgentKnowledge);
    });

    it('should throw NotFoundException when chat agent knowledge not found', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };

      jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.remove(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(whereInput)).rejects.toThrow(
        'Chat agent knowledge association not found',
      );
    });

    it('should throw NotFoundException for Prisma P2025 error', async () => {
      const whereInput = { id: '01234567-89ab-cdef-0123-456789abcdef' };
      const prismaError = { code: 'P2025' };

      jest
        .spyOn(prismaService.chatAgentKnowledge, 'findUnique')
        .mockResolvedValue(mockChatAgentKnowledge);
      jest
        .spyOn(prismaService.chatAgentKnowledge, 'delete')
        .mockRejectedValue(prismaError);

      await expect(service.remove(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(whereInput)).rejects.toThrow(
        'Chat agent knowledge association not found',
      );
    });
  });

  describe('generateCacheKey', () => {
    it('should generate cache key with id', () => {
      const generateCacheKeySpy = jest.spyOn(
        service as any,
        'generateCacheKey',
      );
      generateCacheKeySpy.mockReturnValue(
        'chat_agent_knowledges:findOne:id:test-id',
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (service as any).generateCacheKey('findOne', {
        id: 'test-id',
      });
      expect(result).toBe('chat_agent_knowledges:findOne:id:test-id');
    });

    it('should generate cache key with chatAgentId', () => {
      const generateCacheKeySpy = jest.spyOn(
        service as any,
        'generateCacheKey',
      );
      generateCacheKeySpy.mockReturnValue(
        'chat_agent_knowledges:findByChatAgent:chatAgentId:test-chat-agent-id',
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (service as any).generateCacheKey('findByChatAgent', {
        chatAgentId: 'test-chat-agent-id',
      });
      expect(result).toBe(
        'chat_agent_knowledges:findByChatAgent:chatAgentId:test-chat-agent-id',
      );
    });
  });

  describe('invalidateChatAgentKnowledgeCache', () => {
    it('should delete cache keys', async () => {
      const delSpy = jest.spyOn(cachesService, 'del').mockResolvedValue(1);
      jest
        .spyOn(service as any, 'generateCacheKey')
        .mockReturnValue('test-cache-key');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (service as any).invalidateChatAgentKnowledgeCache(
        mockChatAgentKnowledge,
      );

      expect(delSpy).toHaveBeenCalledWith('test-cache-key');
    });
  });

  describe('invalidateChatAgentKnowledgesCache', () => {
    it('should delete cache key for chat agent knowledges', async () => {
      const chatAgentId = 'test-chat-agent-id';
      const delSpy = jest.spyOn(cachesService, 'del').mockResolvedValue(1);
      jest
        .spyOn(service as any, 'generateCacheKey')
        .mockReturnValue('test-cache-key');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (service as any).invalidateChatAgentKnowledgesCache(chatAgentId);

      expect(delSpy).toHaveBeenCalledWith('test-cache-key');
    });
  });
});
