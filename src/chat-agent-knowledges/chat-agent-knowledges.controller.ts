import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatAgentKnowledgesService } from './chat-agent-knowledges.service';
import { CreateChatAgentKnowledgeDto } from './dto/create-chat-agent-knowledge.dto';
import { UpdateChatAgentKnowledgeDto } from './dto/update-chat-agent-knowledge.dto';
import { ChatAgentKnowledge } from './entities/chat-agent-knowledge.entity';

@ApiBearerAuth()
@ApiTags('chat-agent-knowledges')
@Controller('chat-agent-knowledges')
export class ChatAgentKnowledgesController {
  constructor(
    private readonly chatAgentKnowledgesService: ChatAgentKnowledgesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new chat agent knowledge association',
    description:
      'Associates a knowledge with a chat agent and sets its priority',
  })
  @ApiBody({ type: CreateChatAgentKnowledgeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Chat agent knowledge association created successfully',
    type: ChatAgentKnowledge,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Knowledge is already associated with the chat agent or chat agent/knowledge not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @Body() createChatAgentKnowledgeDto: CreateChatAgentKnowledgeDto,
  ): Promise<ChatAgentKnowledge> {
    return this.chatAgentKnowledgesService.create(createChatAgentKnowledgeDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all chat agent knowledge associations',
    description:
      'Retrieves all chat agent knowledge associations with optional filtering',
  })
  @ApiQuery({
    name: 'chatAgentId',
    required: false,
    description: 'Filter by chat agent ID',
    type: String,
  })
  @ApiQuery({
    name: 'knowledgeId',
    required: false,
    description: 'Filter by knowledge ID',
    type: String,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    type: Number,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Number of records to take',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat agent knowledge associations retrieved successfully',
    type: [ChatAgentKnowledge],
  })
  async findAll(
    @Query('chatAgentId') chatAgentId?: string,
    @Query('knowledgeId') knowledgeId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ChatAgentKnowledge[]> {
    const where: Record<string, string> = {};

    if (chatAgentId) {
      where.chatAgentId = chatAgentId;
    }

    if (knowledgeId) {
      where.knowledgeId = knowledgeId;
    }

    const params: {
      where: Record<string, string>;
      skip?: number;
      take?: number;
    } = { where };

    if (skip) {
      params.skip = parseInt(skip, 10);
    }

    if (take) {
      params.take = parseInt(take, 10);
    }

    return this.chatAgentKnowledgesService.findMany(params);
  }

  @Get('chat-agent/:chatAgentId')
  @ApiOperation({
    summary: 'Get all knowledge associations for a specific chat agent',
    description:
      'Retrieves all knowledge associations for a specific chat agent, ordered by priority',
  })
  @ApiParam({
    name: 'chatAgentId',
    description: 'Chat agent ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat agent knowledge associations retrieved successfully',
    type: [ChatAgentKnowledge],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid chat agent ID format',
  })
  async findByChatAgent(
    @Param('chatAgentId', ParseUUIDPipe) chatAgentId: string,
  ): Promise<ChatAgentKnowledge[]> {
    return this.chatAgentKnowledgesService.findByChatAgent(chatAgentId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific chat agent knowledge association',
    description: 'Retrieves a specific chat agent knowledge association by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat agent knowledge association ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat agent knowledge association retrieved successfully',
    type: ChatAgentKnowledge,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat agent knowledge association not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid ID format',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChatAgentKnowledge | null> {
    return this.chatAgentKnowledgesService.findOne({ id });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a chat agent knowledge association',
    description:
      'Updates the priority or other properties of a chat agent knowledge association',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat agent knowledge association ID',
    type: String,
  })
  @ApiBody({ type: UpdateChatAgentKnowledgeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat agent knowledge association updated successfully',
    type: ChatAgentKnowledge,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat agent knowledge association not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or ID format',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChatAgentKnowledgeDto: UpdateChatAgentKnowledgeDto,
  ): Promise<ChatAgentKnowledge> {
    return this.chatAgentKnowledgesService.update(
      { id },
      updateChatAgentKnowledgeDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a chat agent knowledge association',
    description: 'Removes the association between a chat agent and knowledge',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat agent knowledge association ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Chat agent knowledge association deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat agent knowledge association not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid ID format',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.chatAgentKnowledgesService.remove({ id });
  }
}
