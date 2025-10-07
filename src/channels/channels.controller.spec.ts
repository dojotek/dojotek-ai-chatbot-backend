import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from './entities/channel.entity';

describe('ChannelsController', () => {
  let controller: ChannelsController;

  const mockChannel: Channel = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    chatAgentId: '01234567-89ab-cdef-0123-456789abcdef',
    name: 'Customer Support Channel',
    description: 'Main customer support channel for handling inquiries',
    platform: 'slack',
    workspaceId: 'T1234567890',
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockCreateChannelDto: CreateChannelDto = {
    chatAgentId: '01234567-89ab-cdef-0123-456789abcdef',
    name: 'Customer Support Channel',
    description: 'Main customer support channel for handling inquiries',
    platform: 'slack',
    workspaceId: 'T1234567890',
    isActive: true,
  };

  const mockUpdateChannelDto: UpdateChannelDto = {
    description: 'Updated customer support channel description',
  };

  const mockChannelsService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [
        {
          provide: ChannelsService,
          useValue: mockChannelsService,
        },
      ],
    }).compile();

    controller = module.get<ChannelsController>(ChannelsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a channel successfully', async () => {
      mockChannelsService.create.mockResolvedValue(mockChannel);

      const result = await controller.create(mockCreateChannelDto);

      expect(mockChannelsService.create).toHaveBeenCalledWith(
        mockCreateChannelDto,
      );
      expect(result).toEqual(mockChannel);
    });

    it('should handle ConflictException when channel field already exists', async () => {
      const conflictException = new ConflictException('name already exists');
      mockChannelsService.create.mockRejectedValue(conflictException);

      await expect(controller.create(mockCreateChannelDto)).rejects.toThrow(
        conflictException,
      );
      expect(mockChannelsService.create).toHaveBeenCalledWith(
        mockCreateChannelDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockChannelsService.create.mockRejectedValue(internalServerError);

      await expect(controller.create(mockCreateChannelDto)).rejects.toThrow(
        internalServerError,
      );
      expect(mockChannelsService.create).toHaveBeenCalledWith(
        mockCreateChannelDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all channels successfully without search parameters', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll();

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should return channels with pagination parameters', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(0, 5);

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should return channels with search parameter', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(undefined, undefined, 'Support');

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          OR: [
            { name: { contains: 'Support', mode: 'insensitive' } },
            { description: { contains: 'Support', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should return channels with platform filter', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        'slack',
      );

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          platform: { contains: 'slack', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should return channels with chatAgentId filter', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          chatAgentId: '01234567-89ab-cdef-0123-456789abcdef',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should return channels with isActive filter', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'true',
      );

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should return channels with combined filters', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(
        0,
        5,
        'Support',
        'slack',
        '01234567-89ab-cdef-0123-456789abcdef',
        'true',
      );

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: {
          OR: [
            { name: { contains: 'Support', mode: 'insensitive' } },
            { description: { contains: 'Support', mode: 'insensitive' } },
          ],
          platform: { contains: 'slack', mode: 'insensitive' },
          chatAgentId: '01234567-89ab-cdef-0123-456789abcdef',
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should handle isActive filter with false value', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'false',
      );

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          isActive: false,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });

    it('should ignore invalid isActive filter values', async () => {
      const mockChannels = [mockChannel];
      mockChannelsService.findMany.mockResolvedValue(mockChannels);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'invalid',
      );

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChannels);
    });
  });

  describe('findOne', () => {
    it('should return a channel by id successfully', async () => {
      mockChannelsService.findOne.mockResolvedValue(mockChannel);

      const result = await controller.findOne(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockChannelsService.findOne).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toEqual(mockChannel);
    });

    it('should return null when channel is not found', async () => {
      mockChannelsService.findOne.mockResolvedValue(null);

      const result = await controller.findOne('non-existent-id');

      expect(mockChannelsService.findOne).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a channel successfully', async () => {
      const updatedChannel = {
        ...mockChannel,
        description: 'Updated customer support channel description',
      };
      mockChannelsService.update.mockResolvedValue(updatedChannel);

      const result = await controller.update(
        '01234567-89ab-cdef-0123-456789abcdef',
        mockUpdateChannelDto,
      );

      expect(mockChannelsService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateChannelDto,
      );
      expect(result).toEqual(updatedChannel);
    });

    it('should handle NotFoundException when channel is not found', async () => {
      const notFoundException = new NotFoundException('Channel not found');
      mockChannelsService.update.mockRejectedValue(notFoundException);

      await expect(
        controller.update('non-existent-id', mockUpdateChannelDto),
      ).rejects.toThrow(notFoundException);

      expect(mockChannelsService.update).toHaveBeenCalledWith(
        { id: 'non-existent-id' },
        mockUpdateChannelDto,
      );
    });

    it('should handle ConflictException when channel field already exists', async () => {
      const conflictException = new ConflictException('name already exists');
      mockChannelsService.update.mockRejectedValue(conflictException);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateChannelDto,
        ),
      ).rejects.toThrow(conflictException);

      expect(mockChannelsService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateChannelDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockChannelsService.update.mockRejectedValue(internalServerError);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateChannelDto,
        ),
      ).rejects.toThrow(internalServerError);

      expect(mockChannelsService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateChannelDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a channel successfully', async () => {
      mockChannelsService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockChannelsService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toBeUndefined();
    });

    it('should handle NotFoundException when channel is not found', async () => {
      const notFoundException = new NotFoundException('Channel not found');
      mockChannelsService.delete.mockRejectedValue(notFoundException);

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        notFoundException,
      );
      expect(mockChannelsService.delete).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
    });

    it('should handle ConflictException when channel is being used by other entities', async () => {
      const conflictException = new ConflictException(
        'Cannot delete channel as it is being used by other entities',
      );
      mockChannelsService.delete.mockRejectedValue(conflictException);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(conflictException);

      expect(mockChannelsService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockChannelsService.delete.mockRejectedValue(internalServerError);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(internalServerError);

      expect(mockChannelsService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });
  });
});
