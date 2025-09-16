import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Query,
  ParseIntPipe,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatSessionsService } from './chat-sessions.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { ChatSession } from './entities/chat-session.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('chat-sessions')
@ApiBearerAuth()
@Controller('chat-sessions')
export class ChatSessionsController {
  constructor(private readonly chatSessionsService: ChatSessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({
    status: 201,
    description: 'The chat session has been successfully created.',
    type: ChatSession,
  })
  @ApiResponse({
    status: 409,
    description: 'Chat agent or customer staff not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createChatSessionDto: CreateChatSessionDto,
  ): Promise<ChatSession> {
    try {
      return await this.chatSessionsService.create(createChatSessionDto);
    } catch (error) {
      // Re-throw HTTP exceptions as they are already properly formatted
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        'An unexpected error occurred while creating chat session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all chat sessions' })
  @ApiResponse({
    status: 200,
    description: 'Return all chat sessions.',
    type: [ChatSession],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('chatAgentId') chatAgentId?: string,
    @Query('customerStaffId') customerStaffId?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
  ): Promise<ChatSession[]> {
    try {
      let where: Prisma.ChatSessionWhereInput = {};

      // Add chatAgent filter if provided
      if (chatAgentId) {
        where.chatAgentId = chatAgentId;
      }

      // Add customerStaff filter if provided
      if (customerStaffId) {
        where.customerStaffId = customerStaffId;
      }

      // Add platform filter if provided
      if (platform) {
        where.platform = { contains: platform, mode: 'insensitive' };
      }

      // Add status filter if provided
      if (status) {
        where.status = status;
      }

      // Add search filter if provided (searches in platform and platformThreadId)
      if (search) {
        const searchConditions = [
          { platform: { contains: search, mode: 'insensitive' as const } },
          {
            platformThreadId: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          { status: { contains: search, mode: 'insensitive' as const } },
        ];

        if (Object.keys(where).length > 0) {
          where = {
            AND: [where, { OR: searchConditions }],
          };
        } else {
          where.OR = searchConditions;
        }
      }

      return await this.chatSessionsService.findMany({
        skip,
        take: take || 10,
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching chat sessions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat session by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the chat session.',
    type: ChatSession,
  })
  @ApiResponse({ status: 404, description: 'Chat session not found.' })
  async findOne(@Param('id') id: string): Promise<ChatSession | null> {
    try {
      const chatSession = await this.chatSessionsService.findOne({ id });
      if (!chatSession) {
        throw new HttpException('Chat session not found', HttpStatus.NOT_FOUND);
      }
      return chatSession;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching chat session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chat session' })
  @ApiResponse({
    status: 200,
    description: 'The chat session has been successfully updated.',
    type: ChatSession,
  })
  @ApiResponse({ status: 404, description: 'Chat session not found.' })
  @ApiResponse({
    status: 409,
    description: 'Chat agent or customer staff not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateChatSessionDto: UpdateChatSessionDto,
  ): Promise<ChatSession> {
    try {
      return await this.chatSessionsService.update(
        { id },
        updateChatSessionDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while updating chat session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiResponse({
    status: 204,
    description: 'The chat session has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Chat session not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.chatSessionsService.delete({ id });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while deleting chat session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
