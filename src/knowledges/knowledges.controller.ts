import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Prisma } from '../generated/prisma/client';
import { KnowledgesService } from './knowledges.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { Knowledge } from './entities/knowledge.entity';

@ApiTags('knowledges')
@ApiBearerAuth()
@Controller('knowledges')
export class KnowledgesController {
  constructor(private readonly knowledgesService: KnowledgesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new knowledge' })
  @ApiResponse({
    status: 201,
    description: 'The knowledge has been successfully created.',
    type: Knowledge,
  })
  @ApiResponse({ status: 409, description: 'Knowledge name already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createKnowledgeDto: CreateKnowledgeDto,
  ): Promise<Knowledge> {
    return this.knowledgesService.create(createKnowledgeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all knowledges' })
  @ApiResponse({
    status: 200,
    description: 'Return all knowledges.',
    type: [Knowledge],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Knowledge[]> {
    const where: Prisma.KnowledgeWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' as const };
    }

    if (isActive === 'true' || isActive === 'false') {
      where.isActive = isActive === 'true';
    }

    return this.knowledgesService.findMany({
      skip,
      take: take || 10,
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a knowledge by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the knowledge.',
    type: Knowledge,
  })
  @ApiResponse({ status: 404, description: 'Knowledge not found.' })
  async findOne(@Param('id') id: string): Promise<Knowledge | null> {
    return this.knowledgesService.findOne({ id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a knowledge' })
  @ApiResponse({
    status: 200,
    description: 'The knowledge has been successfully updated.',
    type: Knowledge,
  })
  @ApiResponse({ status: 404, description: 'Knowledge not found.' })
  @ApiResponse({ status: 409, description: 'Knowledge name already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateKnowledgeDto: UpdateKnowledgeDto,
  ): Promise<Knowledge> {
    return this.knowledgesService.update({ id }, updateKnowledgeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a knowledge' })
  @ApiResponse({
    status: 204,
    description: 'The knowledge has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Knowledge not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Cannot delete knowledge as it is being used by chat agents or files.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.knowledgesService.delete({ id });
  }

  @Post(':id/playground')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Search for similar document chunks within a knowledge using vector similarity',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully found matching document chunks.',
    type: Knowledge,
  })
  async playground(
    @Param('id') knowledgeId: string,
    @Body(ValidationPipe)
    playgroundQueryDto: import('./dto/playground-query.dto').PlaygroundQueryDto,
  ): Promise<import('./dto/playground-response.dto').PlaygroundResponseDto> {
    return this.knowledgesService.playground(knowledgeId, playgroundQueryDto);
  }
}
