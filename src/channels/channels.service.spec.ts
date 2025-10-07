import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from '../generated/prisma/client';

describe('ChannelsService', () => {
  let service: ChannelsService;

  const mockChannel: Channel = {
    id: 'test-channel-uuid-123',
    chatAgentId: 'test-agent-uuid-123',
    name: 'Customer Support Channel',
    description: 'Main customer support channel for handling inquiries',
    platform: 'slack',
    workspaceId: 'T1234567890',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    channel: {
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
    cachePrefixChannels: 'channels',
    cacheTtlChannels: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
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

    service = module.get<ChannelsService>(ChannelsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached channel when found in cache', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockChannel);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockChannel);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'channels:findOne:id:test-channel-uuid-123',
      );
      expect(mockPrismaService.channel.findUnique).not.toHaveBeenCalled();
    });

    it('should return channel from database and cache it when not in cache', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockChannel);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'channels:findOne:id:test-channel-uuid-123',
      );
      expect(mockPrismaService.channel.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'channels:findOne:id:test-channel-uuid-123',
        mockChannel,
        3600,
      );
    });

    it('should return null when channel not found and not cache null result', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.channel.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'channels:findOne:id:non-existent-uuid',
      );
      expect(mockPrismaService.channel.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return array of channels with default parameters', async () => {
      const channels = [mockChannel];
      mockPrismaService.channel.findMany.mockResolvedValue(channels);

      const result = await service.findMany({});

      expect(result).toEqual(channels);
      expect(mockPrismaService.channel.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return array of channels with custom parameters', async () => {
      const channels = [mockChannel];
      const params = {
        skip: 0,
        take: 10,
        cursor: { id: 'test-channel-uuid-123' },
        where: { name: { contains: 'Support' } },
        orderBy: { createdAt: 'desc' as const },
      };
      mockPrismaService.channel.findMany.mockResolvedValue(channels);

      const result = await service.findMany(params);

      expect(result).toEqual(channels);
      expect(mockPrismaService.channel.findMany).toHaveBeenCalledWith(params);
    });
  });

  describe('create', () => {
    const createChannelDto: CreateChannelDto = {
      chatAgentId: 'test-agent-uuid-123',
      name: 'Customer Support Channel',
      description: 'Main customer support channel for handling inquiries',
      platform: 'slack',
      workspaceId: 'T1234567890',
      isActive: true,
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
    });

    it('should create a channel and cache it', async () => {
      mockPrismaService.channel.create.mockResolvedValue(mockChannel);

      const result = await service.create(createChannelDto);

      expect(result).toEqual(mockChannel);
      expect(mockPrismaService.channel.create).toHaveBeenCalledWith({
        data: {
          chatAgentId: 'test-agent-uuid-123',
          name: 'Customer Support Channel',
          description: 'Main customer support channel for handling inquiries',
          platform: 'slack',
          workspaceId: 'T1234567890',
          isActive: true,
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'channels:findOne:id:test-channel-uuid-123',
        mockChannel,
        3600,
      );
    });

    it('should create a channel with default isActive true when not provided', async () => {
      const dtoWithoutIsActive = { ...createChannelDto };
      delete dtoWithoutIsActive.isActive;

      mockPrismaService.channel.create.mockResolvedValue(mockChannel);

      const result = await service.create(dtoWithoutIsActive);

      expect(result).toEqual(mockChannel);
      expect(mockPrismaService.channel.create).toHaveBeenCalledWith({
        data: {
          chatAgentId: 'test-agent-uuid-123',
          name: 'Customer Support Channel',
          description: 'Main customer support channel for handling inquiries',
          platform: 'slack',
          workspaceId: 'T1234567890',
          isActive: true,
        },
      });
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['chatAgentId', 'platform', 'workspaceId'] },
      };
      mockPrismaService.channel.create.mockRejectedValue(prismaError);

      await expect(service.create(createChannelDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createChannelDto)).rejects.toThrow(
        'chatAgentId already exists',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.channel.create.mockRejectedValue(prismaError);

      await expect(service.create(createChannelDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(createChannelDto)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const error = new Error('Custom error');
      mockPrismaService.channel.create.mockRejectedValue(error);

      await expect(service.create(createChannelDto)).rejects.toThrow(
        'Custom error',
      );
    });
  });

  describe('update', () => {
    const updateChannelDto: UpdateChannelDto = {
      name: 'Updated Support Channel',
      description: 'Updated customer support channel',
      isActive: false,
    };

    const updatedChannel: Channel = {
      ...mockChannel,
      name: 'Updated Support Channel',
      description: 'Updated customer support channel',
      isActive: false,
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should update a channel and update cache', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.update.mockResolvedValue(updatedChannel);

      const result = await service.update(whereInput, updateChannelDto);

      expect(result).toEqual(updatedChannel);
      expect(mockPrismaService.channel.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.channel.update).toHaveBeenCalledWith({
        where: whereInput,
        data: {
          chatAgentId: undefined,
          name: 'Updated Support Channel',
          description: 'Updated customer support channel',
          platform: undefined,
          workspaceId: undefined,
          isActive: false,
        },
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'channels:findOne:id:test-channel-uuid-123',
      );
      // Check new cache entry
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'channels:findOne:id:test-channel-uuid-123',
        updatedChannel,
        3600,
      );
    });

    it('should throw NotFoundException when channel not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.channel.findUnique.mockResolvedValue(null);

      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow('Channel not found');
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      const prismaError = {
        code: 'P2002',
        meta: { target: ['chatAgentId', 'platform', 'workspaceId'] },
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow('chatAgentId already exists');
    });

    it('should throw NotFoundException on record not found during update', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow('Channel not found');
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(whereInput, updateChannelDto),
      ).rejects.toThrow('Database operation failed');
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should delete a channel successfully and invalidate cache', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.delete.mockResolvedValue(mockChannel);

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockChannel);
      expect(mockPrismaService.channel.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.channel.delete).toHaveBeenCalledWith({
        where: whereInput,
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'channels:findOne:id:test-channel-uuid-123',
      );
    });

    it('should throw NotFoundException when channel not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.channel.findUnique.mockResolvedValue(null);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Channel not found',
      );
    });

    it('should throw NotFoundException on record not found during delete', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Channel not found',
      );
    });

    it('should throw ConflictException on foreign key constraint violation', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      const prismaError = {
        code: 'P2003',
        meta: {},
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Cannot delete channel as it is being used by other entities',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-channel-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });
});
