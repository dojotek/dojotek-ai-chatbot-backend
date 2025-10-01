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
import { ChatAgentsService } from './chat-agents.service';
import { CreateChatAgentDto } from './dto/create-chat-agent.dto';
import { UpdateChatAgentDto } from './dto/update-chat-agent.dto';
import { PlaygroundRequestDto } from './dto/playground-request.dto';
import { PlaygroundResponseDto } from './dto/playground-response.dto';
import { ChatAgent } from './entities/chat-agent.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('chat-agents')
@ApiBearerAuth()
@Controller('chat-agents')
export class ChatAgentsController {
  constructor(private readonly chatAgentsService: ChatAgentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat agent' })
  @ApiResponse({
    status: 201,
    description: 'The chat agent has been successfully created.',
    type: ChatAgent,
  })
  @ApiResponse({
    status: 409,
    description: 'Customer not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createChatAgentDto: CreateChatAgentDto,
  ): Promise<ChatAgent> {
    try {
      return await this.chatAgentsService.create(createChatAgentDto);
    } catch (error) {
      // Re-throw HTTP exceptions as they are already properly formatted
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        'An unexpected error occurred while creating chat agent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all chat agents' })
  @ApiResponse({
    status: 200,
    description: 'Return all chat agents.',
    type: [ChatAgent],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ): Promise<ChatAgent[]> {
    try {
      let where: Prisma.ChatAgentWhereInput = {};

      // Add customer filter if provided
      if (customerId) {
        where.customerId = customerId;
      }

      // Add search filter if provided
      if (search) {
        const searchConditions = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { systemPrompt: { contains: search, mode: 'insensitive' as const } },
        ];

        if (Object.keys(where).length > 0) {
          where = {
            AND: [where, { OR: searchConditions }],
          };
        } else {
          where.OR = searchConditions;
        }
      }

      return await this.chatAgentsService.findMany({
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
        'An unexpected error occurred while fetching chat agents',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat agent by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the chat agent.',
    type: ChatAgent,
  })
  @ApiResponse({ status: 404, description: 'Chat agent not found.' })
  async findOne(@Param('id') id: string): Promise<ChatAgent | null> {
    try {
      const chatAgent = await this.chatAgentsService.findOne({ id });
      if (!chatAgent) {
        throw new HttpException('Chat agent not found', HttpStatus.NOT_FOUND);
      }
      return chatAgent;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching chat agent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chat agent' })
  @ApiResponse({
    status: 200,
    description: 'The chat agent has been successfully updated.',
    type: ChatAgent,
  })
  @ApiResponse({ status: 404, description: 'Chat agent not found.' })
  @ApiResponse({
    status: 409,
    description: 'Customer not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateChatAgentDto: UpdateChatAgentDto,
  ): Promise<ChatAgent> {
    try {
      return await this.chatAgentsService.update({ id }, updateChatAgentDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while updating chat agent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chat agent' })
  @ApiResponse({
    status: 204,
    description: 'The chat agent has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Chat agent not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.chatAgentsService.delete({ id });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while deleting chat agent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('playground')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run playground inference same as sample consumer' })
  @ApiResponse({ status: 200, description: 'AI response and message id' })
  async playground(
    @Body(ValidationPipe) body: PlaygroundRequestDto,
  ): Promise<PlaygroundResponseDto> {
    try {
      return await this.chatAgentsService.playground(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while running playground',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
