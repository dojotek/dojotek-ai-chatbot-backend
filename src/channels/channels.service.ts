import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Channel, Prisma } from '../generated/prisma/client';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';

interface PrismaError {
  code: string;
  meta?: { target?: string[] };
}

function isPrismaError(error: unknown): error is PrismaError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

@Injectable()
export class ChannelsService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    channelWhereUniqueInput: Prisma.ChannelWhereUniqueInput,
  ): Promise<Channel | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey('findOne', channelWhereUniqueInput);

    // Try to get from cache first
    const cachedChannel = await this.cachesService.get<Channel>(cacheKey);
    if (cachedChannel) {
      return cachedChannel;
    }

    // If not in cache, get from database
    const channel = await this.prisma.channel.findUnique({
      where: channelWhereUniqueInput,
    });

    // Cache the result if channel exists
    if (channel) {
      await this.cachesService.set(
        cacheKey,
        channel,
        this.configsService.cacheTtlChannels,
      );
    }

    return channel;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ChannelWhereUniqueInput;
    where?: Prisma.ChannelWhereInput;
    orderBy?: Prisma.ChannelOrderByWithRelationInput;
  }): Promise<Channel[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.channel.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(createChannelDto: CreateChannelDto): Promise<Channel> {
    try {
      const channel = await this.prisma.channel.create({
        data: {
          chatAgentId: createChannelDto.chatAgentId,
          name: createChannelDto.name,
          description: createChannelDto.description,
          platform: createChannelDto.platform,
          workspaceId: createChannelDto.workspaceId,
          isActive: createChannelDto.isActive ?? true,
        },
      });

      // Cache the newly created channel
      const cacheKey = this.generateCacheKey('findOne', { id: channel.id });
      await this.cachesService.set(
        cacheKey,
        channel,
        this.configsService.cacheTtlChannels,
      );

      return channel;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async update(
    where: Prisma.ChannelWhereUniqueInput,
    updateChannelDto: UpdateChannelDto,
  ): Promise<Channel> {
    try {
      // Get the current channel first to handle cache invalidation
      const existingChannel = await this.prisma.channel.findUnique({ where });
      if (!existingChannel) {
        throw new NotFoundException('Channel not found');
      }

      const updatedChannel = await this.prisma.channel.update({
        data: {
          chatAgentId: updateChannelDto.chatAgentId,
          name: updateChannelDto.name,
          description: updateChannelDto.description,
          platform: updateChannelDto.platform,
          workspaceId: updateChannelDto.workspaceId,
          isActive: updateChannelDto.isActive,
        },
        where,
      });

      // Invalidate old cache entries
      await this.invalidateChannelCache(existingChannel);

      // Cache the updated channel
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedChannel.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedChannel,
        this.configsService.cacheTtlChannels,
      );

      return updatedChannel;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Channel not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async delete(where: Prisma.ChannelWhereUniqueInput): Promise<Channel> {
    try {
      // Get the channel first to handle cache invalidation
      const channelToDelete = await this.prisma.channel.findUnique({ where });
      if (!channelToDelete) {
        throw new NotFoundException('Channel not found');
      }

      const deletedChannel = await this.prisma.channel.delete({
        where,
      });

      // Invalidate cache entries
      await this.invalidateChannelCache(channelToDelete);

      return deletedChannel;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Channel not found');
      }

      // Handle foreign key constraint violation
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete channel as it is being used by other entities',
        );
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Generate cache key for channel operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.ChannelWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixChannels;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a channel
   */
  private async invalidateChannelCache(channel: Channel): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: channel.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
