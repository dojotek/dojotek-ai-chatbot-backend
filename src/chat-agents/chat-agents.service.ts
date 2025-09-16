import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatAgent, Prisma } from '../generated/prisma/client';
import { CreateChatAgentDto } from './dto/create-chat-agent.dto';
import { UpdateChatAgentDto } from './dto/update-chat-agent.dto';
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
export class ChatAgentsService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    chatAgentWhereUniqueInput: Prisma.ChatAgentWhereUniqueInput,
  ): Promise<ChatAgent | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      chatAgentWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedChatAgent = await this.cachesService.get<ChatAgent>(cacheKey);
    if (cachedChatAgent) {
      return cachedChatAgent;
    }

    // If not in cache, get from database
    const chatAgent = await this.prisma.chatAgent.findUnique({
      where: chatAgentWhereUniqueInput,
    });

    // Cache the result if chatAgent exists
    if (chatAgent) {
      await this.cachesService.set(
        cacheKey,
        chatAgent,
        this.configsService.cacheTtlChatAgents,
      );
    }

    return chatAgent;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ChatAgentWhereUniqueInput;
    where?: Prisma.ChatAgentWhereInput;
    orderBy?: Prisma.ChatAgentOrderByWithRelationInput;
  }): Promise<ChatAgent[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.chatAgent.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(createChatAgentDto: CreateChatAgentDto): Promise<ChatAgent> {
    try {
      const { customerId, ...chatAgentData } = createChatAgentDto;
      const chatAgent = await this.prisma.chatAgent.create({
        data: {
          ...chatAgentData,
          customer: {
            connect: {
              id: customerId,
            },
          },
        },
      });

      // Cache the newly created chatAgent
      const cacheKey = this.generateCacheKey('findOne', {
        id: chatAgent.id,
      });
      await this.cachesService.set(
        cacheKey,
        chatAgent,
        this.configsService.cacheTtlChatAgents,
      );

      return chatAgent;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle foreign key constraint failure (customer not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Customer not found');
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
    where: Prisma.ChatAgentWhereUniqueInput,
    updateChatAgentDto: UpdateChatAgentDto,
  ): Promise<ChatAgent> {
    try {
      // Get the current chatAgent first to handle cache invalidation
      const existingChatAgent = await this.prisma.chatAgent.findUnique({
        where,
      });

      // Prepare update data
      const { customerId, ...updateData } = updateChatAgentDto;
      const updateInput: Prisma.ChatAgentUpdateInput = { ...updateData };

      // Handle customer relationship update if customerId is provided
      if (customerId) {
        updateInput.customer = {
          connect: {
            id: customerId,
          },
        };
      }

      const updatedChatAgent = await this.prisma.chatAgent.update({
        data: updateInput,
        where,
      });

      // Invalidate old cache entries
      if (existingChatAgent) {
        await this.invalidateChatAgentCache(existingChatAgent);
      }

      // Cache the updated chatAgent
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedChatAgent.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedChatAgent,
        this.configsService.cacheTtlChatAgents,
      );

      return updatedChatAgent;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('Chat agent not found');
      }

      // Handle foreign key constraint failure (customer not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Customer not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async delete(where: Prisma.ChatAgentWhereUniqueInput): Promise<ChatAgent> {
    try {
      // Get the chatAgent first to handle cache invalidation
      const chatAgentToDelete = await this.prisma.chatAgent.findUnique({
        where,
      });

      const deletedChatAgent = await this.prisma.chatAgent.delete({
        where,
      });

      // Invalidate cache entries
      if (chatAgentToDelete) {
        await this.invalidateChatAgentCache(chatAgentToDelete);
      }

      return deletedChatAgent;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('Chat agent not found');
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
   * Generate cache key for chatAgent operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.ChatAgentWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixChatAgents;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a chatAgent
   */
  private async invalidateChatAgentCache(chatAgent: ChatAgent): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: chatAgent.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
