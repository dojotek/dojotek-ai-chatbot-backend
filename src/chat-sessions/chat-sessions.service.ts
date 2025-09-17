import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatSession, Prisma } from '../generated/prisma/client';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
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
export class ChatSessionsService {
  private readonly logger = new Logger(ChatSessionsService.name);

  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    chatSessionWhereUniqueInput: Prisma.ChatSessionWhereUniqueInput,
  ): Promise<ChatSession | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      chatSessionWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedChatSession =
      await this.cachesService.get<ChatSession>(cacheKey);
    if (cachedChatSession) {
      return cachedChatSession;
    }

    // If not in cache, get from database
    const chatSession = await this.prisma.chatSession.findUnique({
      where: chatSessionWhereUniqueInput,
    });

    // Cache the result if chatSession exists
    if (chatSession) {
      await this.cachesService.set(
        cacheKey,
        chatSession,
        this.configsService.cacheTtlChatSessions,
      );
    }

    return chatSession;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ChatSessionWhereUniqueInput;
    where?: Prisma.ChatSessionWhereInput;
    orderBy?: Prisma.ChatSessionOrderByWithRelationInput;
  }): Promise<ChatSession[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.chatSession.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(
    createChatSessionDto: CreateChatSessionDto,
  ): Promise<ChatSession> {
    try {
      const { chatAgentId, customerStaffId, expiresAt, ...chatSessionData } =
        createChatSessionDto;

      const chatSession = await this.prisma.chatSession.create({
        data: {
          ...chatSessionData,
          expiresAt: new Date(expiresAt),
          chatAgent: {
            connect: {
              id: chatAgentId,
            },
          },
          customerStaff: {
            connect: {
              id: customerStaffId,
            },
          },
        },
      });

      // Cache the newly created chatSession
      const cacheKey = this.generateCacheKey('findOne', {
        id: chatSession.id,
      });
      await this.cachesService.set(
        cacheKey,
        chatSession,
        this.configsService.cacheTtlChatSessions,
      );

      return chatSession;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle foreign key constraint failure (chatAgent or customerStaff not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Chat agent or customer staff not found');
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
    where: Prisma.ChatSessionWhereUniqueInput,
    updateChatSessionDto: UpdateChatSessionDto,
  ): Promise<ChatSession> {
    try {
      // Get the current chatSession first to handle cache invalidation
      const existingChatSession = await this.prisma.chatSession.findUnique({
        where,
      });

      // Prepare update data
      const { chatAgentId, customerStaffId, expiresAt, ...updateData } =
        updateChatSessionDto;
      const updateInput: Prisma.ChatSessionUpdateInput = { ...updateData };

      // Handle expiresAt conversion if provided
      if (expiresAt) {
        updateInput.expiresAt = new Date(expiresAt);
      }

      // Handle chatAgent relationship update if chatAgentId is provided
      if (chatAgentId) {
        updateInput.chatAgent = {
          connect: {
            id: chatAgentId,
          },
        };
      }

      // Handle customerStaff relationship update if customerStaffId is provided
      if (customerStaffId) {
        updateInput.customerStaff = {
          connect: {
            id: customerStaffId,
          },
        };
      }

      const updatedChatSession = await this.prisma.chatSession.update({
        data: updateInput,
        where,
      });

      // Invalidate old cache entries
      if (existingChatSession) {
        await this.invalidateChatSessionCache(existingChatSession);
      }

      // Cache the updated chatSession
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedChatSession.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedChatSession,
        this.configsService.cacheTtlChatSessions,
      );

      return updatedChatSession;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('Chat session not found');
      }

      // Handle foreign key constraint failure (chatAgent or customerStaff not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Chat agent or customer staff not found');
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
    where: Prisma.ChatSessionWhereUniqueInput,
  ): Promise<ChatSession> {
    try {
      // Get the chatSession first to handle cache invalidation
      const chatSessionToDelete = await this.prisma.chatSession.findUnique({
        where,
      });

      const deletedChatSession = await this.prisma.chatSession.delete({
        where,
      });

      // Invalidate cache entries
      if (chatSessionToDelete) {
        await this.invalidateChatSessionCache(chatSessionToDelete);
      }

      return deletedChatSession;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
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

  async getInboundChatSessionId(
    chatAgentId: string,
    customerId: string,
    customerStaffId: string,
    platform: string,
  ): Promise<string> {
    // Generate cache key for inbound chat session
    const cacheKey = this.generateInboundChatSessionCacheKey(
      chatAgentId,
      customerId,
      customerStaffId,
      platform,
    );

    // Try to get from cache first
    const cachedSessionId = await this.cachesService.get<string>(cacheKey);
    if (cachedSessionId) {
      this.logger.debug(`Found cached chat session ID: ${cachedSessionId}`);
      return cachedSessionId;
    }

    // Search in database
    const existingSession = await this.prisma.chatSession.findFirst({
      where: {
        chatAgentId,
        customerStaffId,
        platform,
        expiresAt: {
          gt: new Date(), // Only active sessions
        },
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent active session
      },
    });

    if (existingSession) {
      // Cache the existing session ID
      await this.cachesService.set(
        cacheKey,
        existingSession.id,
        this.configsService.inboundChatSessionTtlSample,
      );
      this.logger.debug(
        `Found existing chat session ID: ${existingSession.id}`,
      );
      return existingSession.id;
    }

    // Create new session if none exists
    const newSession = await this.prisma.chatSession.create({
      data: {
        chatAgentId,
        customerStaffId,
        platform,
        expiresAt: new Date(
          Date.now() + this.configsService.inboundChatSessionTtlSample * 1000,
        ),
        status: 'active',
      },
    });

    // Cache the new session ID
    await this.cachesService.set(
      cacheKey,
      newSession.id,
      this.configsService.inboundChatSessionTtlSample,
    );

    this.logger.debug(`Created new chat session ID: ${newSession.id}`);
    return newSession.id;
  }

  /**
   * Generate cache key for chatSession operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.ChatSessionWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixChatSessions;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Generate cache key for inbound chat session lookup
   */
  private generateInboundChatSessionCacheKey(
    chatAgentId: string,
    customerId: string,
    customerStaffId: string,
    platform: string,
  ): string {
    const prefix = this.configsService.cachePrefixChatSessions;
    return `${prefix}:inbound:${chatAgentId}:${customerId}:${customerStaffId}:${platform}`;
  }

  /**
   * Invalidate all cache entries for a chatSession
   */
  private async invalidateChatSessionCache(
    chatSession: ChatSession,
  ): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: chatSession.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
