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
import { ChatMessagesService } from './chat-messages.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('chat-messages')
@ApiBearerAuth()
@Controller('chat-messages')
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat message' })
  @ApiResponse({
    status: 201,
    description: 'The chat message has been successfully created.',
    type: ChatMessage,
  })
  @ApiResponse({
    status: 409,
    description: 'Chat session not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createChatMessageDto: CreateChatMessageDto,
  ): Promise<ChatMessage> {
    try {
      return await this.chatMessagesService.create(createChatMessageDto);
    } catch (error) {
      // Re-throw HTTP exceptions as they are already properly formatted
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        'An unexpected error occurred while creating chat message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all chat messages' })
  @ApiResponse({
    status: 200,
    description: 'Return all chat messages.',
    type: [ChatMessage],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('chatSessionId') chatSessionId?: string,
    @Query('messageType') messageType?: string,
  ): Promise<ChatMessage[]> {
    try {
      let where: Prisma.ChatMessageWhereInput = {};

      // Add chat session filter if provided
      if (chatSessionId) {
        where.chatSessionId = chatSessionId;
      }

      // Add message type filter if provided
      if (messageType) {
        where.messageType = messageType;
      }

      // Add search filter if provided
      if (search) {
        const searchConditions = [
          { content: { contains: search, mode: 'insensitive' as const } },
          { messageType: { contains: search, mode: 'insensitive' as const } },
        ];

        if (Object.keys(where).length > 0) {
          where = {
            AND: [where, { OR: searchConditions }],
          };
        } else {
          where.OR = searchConditions;
        }
      }

      return await this.chatMessagesService.findMany({
        skip,
        take: take || 50, // Default to 50 messages per page
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching chat messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat message by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the chat message.',
    type: ChatMessage,
  })
  @ApiResponse({ status: 404, description: 'Chat message not found.' })
  async findOne(@Param('id') id: string): Promise<ChatMessage | null> {
    try {
      const chatMessage = await this.chatMessagesService.findOne({ id });
      if (!chatMessage) {
        throw new HttpException('Chat message not found', HttpStatus.NOT_FOUND);
      }
      return chatMessage;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching chat message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chat message' })
  @ApiResponse({
    status: 200,
    description: 'The chat message has been successfully updated.',
    type: ChatMessage,
  })
  @ApiResponse({ status: 404, description: 'Chat message not found.' })
  @ApiResponse({
    status: 409,
    description: 'Chat session not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateChatMessageDto: UpdateChatMessageDto,
  ): Promise<ChatMessage> {
    try {
      return await this.chatMessagesService.update(
        { id },
        updateChatMessageDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while updating chat message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chat message' })
  @ApiResponse({
    status: 204,
    description: 'The chat message has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Chat message not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.chatMessagesService.delete({ id });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while deleting chat message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
