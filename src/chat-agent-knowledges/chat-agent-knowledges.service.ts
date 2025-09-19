import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatAgentKnowledge, Prisma } from '../generated/prisma/client';
import { CreateChatAgentKnowledgeDto } from './dto/create-chat-agent-knowledge.dto';
import { UpdateChatAgentKnowledgeDto } from './dto/update-chat-agent-knowledge.dto';
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
export class ChatAgentKnowledgesService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    chatAgentKnowledgeWhereUniqueInput: Prisma.ChatAgentKnowledgeWhereUniqueInput,
  ): Promise<ChatAgentKnowledge | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      chatAgentKnowledgeWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedChatAgentKnowledge =
      await this.cachesService.get<ChatAgentKnowledge>(cacheKey);
    if (cachedChatAgentKnowledge) {
      return cachedChatAgentKnowledge;
    }

    // If not in cache, get from database
    const chatAgentKnowledge = await this.prisma.chatAgentKnowledge.findUnique({
      where: chatAgentKnowledgeWhereUniqueInput,
      include: {
        chatAgent: true,
        knowledge: true,
      },
    });

    // Cache the result if chatAgentKnowledge exists
    if (chatAgentKnowledge) {
      await this.cachesService.set(
        cacheKey,
        chatAgentKnowledge,
        this.configsService.cacheTtlChatAgentKnowledges,
      );
    }

    return chatAgentKnowledge;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ChatAgentKnowledgeWhereUniqueInput;
    where?: Prisma.ChatAgentKnowledgeWhereInput;
    orderBy?: Prisma.ChatAgentKnowledgeOrderByWithRelationInput;
  }): Promise<ChatAgentKnowledge[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.chatAgentKnowledge.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        chatAgent: true,
        knowledge: true,
      },
    });
  }

  async findByChatAgent(chatAgentId: string): Promise<ChatAgentKnowledge[]> {
    // Generate cache key for chat agent knowledges
    const cacheKey = this.generateCacheKey('findByChatAgent', { chatAgentId });

    // Try to get from cache first
    const cachedKnowledges =
      await this.cachesService.get<ChatAgentKnowledge[]>(cacheKey);
    if (cachedKnowledges) {
      return cachedKnowledges;
    }

    // If not in cache, get from database
    const knowledges = await this.prisma.chatAgentKnowledge.findMany({
      where: { chatAgentId },
      include: {
        chatAgent: true,
        knowledge: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    // Cache the result
    await this.cachesService.set(
      cacheKey,
      knowledges,
      this.configsService.cacheTtlChatAgentKnowledges,
    );

    return knowledges;
  }

  async create(
    createChatAgentKnowledgeDto: CreateChatAgentKnowledgeDto,
  ): Promise<ChatAgentKnowledge> {
    try {
      const {
        chatAgentId,
        knowledgeId,
        priority = 1,
      } = createChatAgentKnowledgeDto;

      const chatAgentKnowledge = await this.prisma.chatAgentKnowledge.create({
        data: {
          chatAgentId,
          knowledgeId,
          priority,
        },
        include: {
          chatAgent: true,
          knowledge: true,
        },
      });

      // Cache the newly created chatAgentKnowledge
      const cacheKey = this.generateCacheKey('findOne', {
        id: chatAgentKnowledge.id,
      });
      await this.cachesService.set(
        cacheKey,
        chatAgentKnowledge,
        this.configsService.cacheTtlChatAgentKnowledges,
      );

      // Invalidate chat agent knowledges cache
      await this.invalidateChatAgentKnowledgesCache(chatAgentId);

      return chatAgentKnowledge;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        throw new ConflictException(
          'This knowledge is already associated with the chat agent',
        );
      }

      // Handle foreign key constraint failure (chat agent or knowledge not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Chat agent or knowledge not found');
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
    where: Prisma.ChatAgentKnowledgeWhereUniqueInput,
    updateChatAgentKnowledgeDto: UpdateChatAgentKnowledgeDto,
  ): Promise<ChatAgentKnowledge> {
    try {
      // Get the current chatAgentKnowledge first to handle cache invalidation
      const existingChatAgentKnowledge =
        await this.prisma.chatAgentKnowledge.findUnique({
          where,
        });

      if (!existingChatAgentKnowledge) {
        throw new NotFoundException(
          'Chat agent knowledge association not found',
        );
      }

      const updatedChatAgentKnowledge =
        await this.prisma.chatAgentKnowledge.update({
          data: updateChatAgentKnowledgeDto,
          where,
          include: {
            chatAgent: true,
            knowledge: true,
          },
        });

      // Invalidate old cache entries
      if (existingChatAgentKnowledge) {
        await this.invalidateChatAgentKnowledgeCache(
          existingChatAgentKnowledge,
        );
      }

      // Cache the updated chatAgentKnowledge
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedChatAgentKnowledge.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedChatAgentKnowledge,
        this.configsService.cacheTtlChatAgentKnowledges,
      );

      // Invalidate chat agent knowledges cache
      await this.invalidateChatAgentKnowledgesCache(
        existingChatAgentKnowledge.chatAgentId,
      );

      return updatedChatAgentKnowledge;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException(
          'Chat agent knowledge association not found',
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

  async remove(
    where: Prisma.ChatAgentKnowledgeWhereUniqueInput,
  ): Promise<ChatAgentKnowledge> {
    try {
      // Get the chatAgentKnowledge first to handle cache invalidation
      const chatAgentKnowledgeToDelete =
        await this.prisma.chatAgentKnowledge.findUnique({
          where,
        });

      if (!chatAgentKnowledgeToDelete) {
        throw new NotFoundException(
          'Chat agent knowledge association not found',
        );
      }

      const deletedChatAgentKnowledge =
        await this.prisma.chatAgentKnowledge.delete({
          where,
        });

      // Invalidate cache entries
      await this.invalidateChatAgentKnowledgeCache(chatAgentKnowledgeToDelete);
      await this.invalidateChatAgentKnowledgesCache(
        chatAgentKnowledgeToDelete.chatAgentId,
      );

      return deletedChatAgentKnowledge;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException(
          'Chat agent knowledge association not found',
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
   * Generate cache key for chatAgentKnowledge operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.ChatAgentKnowledgeWhereUniqueInput | { chatAgentId: string },
  ): string {
    const prefix = this.configsService.cachePrefixChatAgentKnowledges;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if ('id' in params && params.id) {
      keyParts.push(`id:${String(params.id)}`);
    } else if (
      'chatAgentId' in params &&
      typeof params.chatAgentId === 'string'
    ) {
      keyParts.push(`chatAgentId:${params.chatAgentId}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a chatAgentKnowledge
   */
  private async invalidateChatAgentKnowledgeCache(
    chatAgentKnowledge: ChatAgentKnowledge,
  ): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: chatAgentKnowledge.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }

  /**
   * Invalidate chat agent knowledges cache
   */
  private async invalidateChatAgentKnowledgesCache(
    chatAgentId: string,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey('findByChatAgent', { chatAgentId });
    await this.cachesService.del(cacheKey);
  }
}
