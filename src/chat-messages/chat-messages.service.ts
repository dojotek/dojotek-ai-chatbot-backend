import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessage, Prisma } from '../generated/prisma/client';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
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
export class ChatMessagesService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    chatMessageWhereUniqueInput: Prisma.ChatMessageWhereUniqueInput,
  ): Promise<ChatMessage | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      chatMessageWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedChatMessage =
      await this.cachesService.get<ChatMessage>(cacheKey);
    if (cachedChatMessage) {
      return cachedChatMessage;
    }

    // If not in cache, get from database
    const chatMessage = await this.prisma.chatMessage.findUnique({
      where: chatMessageWhereUniqueInput,
    });

    // Cache the result if chatMessage exists
    if (chatMessage) {
      await this.cachesService.set(
        cacheKey,
        chatMessage,
        this.configsService.cacheTtlChatMessages,
      );
    }

    return chatMessage;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ChatMessageWhereUniqueInput;
    where?: Prisma.ChatMessageWhereInput;
    orderBy?: Prisma.ChatMessageOrderByWithRelationInput;
  }): Promise<ChatMessage[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.chatMessage.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(
    createChatMessageDto: CreateChatMessageDto,
  ): Promise<ChatMessage> {
    try {
      const { chatSessionId, ...chatMessageData } = createChatMessageDto;
      const chatMessage = await this.prisma.chatMessage.create({
        data: {
          ...chatMessageData,
          chatSession: {
            connect: {
              id: chatSessionId,
            },
          },
        },
      });

      // Cache the newly created chatMessage
      const cacheKey = this.generateCacheKey('findOne', {
        id: chatMessage.id,
      });
      await this.cachesService.set(
        cacheKey,
        chatMessage,
        this.configsService.cacheTtlChatMessages,
      );

      return chatMessage;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle foreign key constraint failure (chat session not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Chat session not found');
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
    where: Prisma.ChatMessageWhereUniqueInput,
    updateChatMessageDto: UpdateChatMessageDto,
  ): Promise<ChatMessage> {
    try {
      // Get the current chatMessage first to handle cache invalidation
      const existingChatMessage = await this.prisma.chatMessage.findUnique({
        where,
      });

      // Prepare update data
      const { chatSessionId, ...updateData } = updateChatMessageDto;
      const updateInput: Prisma.ChatMessageUpdateInput = { ...updateData };

      // Handle chat session relationship update if chatSessionId is provided
      if (chatSessionId) {
        updateInput.chatSession = {
          connect: {
            id: chatSessionId,
          },
        };
      }

      const updatedChatMessage = await this.prisma.chatMessage.update({
        data: updateInput,
        where,
      });

      // Invalidate old cache entries
      if (existingChatMessage) {
        await this.invalidateChatMessageCache(existingChatMessage);
      }

      // Cache the updated chatMessage
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedChatMessage.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedChatMessage,
        this.configsService.cacheTtlChatMessages,
      );

      return updatedChatMessage;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('Chat message not found');
      }

      // Handle foreign key constraint failure (chat session not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Chat session not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async delete(
    where: Prisma.ChatMessageWhereUniqueInput,
  ): Promise<ChatMessage> {
    try {
      // Get the chatMessage first to handle cache invalidation
      const chatMessageToDelete = await this.prisma.chatMessage.findUnique({
        where,
      });

      const deletedChatMessage = await this.prisma.chatMessage.delete({
        where,
      });

      // Invalidate cache entries
      if (chatMessageToDelete) {
        await this.invalidateChatMessageCache(chatMessageToDelete);
      }

      return deletedChatMessage;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('Chat message not found');
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
   * Generate cache key for chatMessage operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.ChatMessageWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixChatMessages;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a chatMessage
   */
  private async invalidateChatMessageCache(
    chatMessage: ChatMessage,
  ): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: chatMessage.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
