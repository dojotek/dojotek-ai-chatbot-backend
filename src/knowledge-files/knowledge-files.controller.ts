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
import { Prisma } from '../generated/prisma/client';
import { KnowledgeFilesService } from './knowledge-files.service';
import { CreateKnowledgeFileDto } from './dto/create-knowledge-file.dto';
import { UpdateKnowledgeFileDto } from './dto/update-knowledge-file.dto';
import { KnowledgeFile } from './entities/knowledge-file.entity';

@ApiTags('knowledge-files')
@ApiBearerAuth()
@Controller('knowledge-files')
export class KnowledgeFilesController {
  constructor(private readonly knowledgeFilesService: KnowledgeFilesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new knowledge file' })
  @ApiResponse({
    status: 201,
    description: 'The knowledge file has been successfully created.',
    type: KnowledgeFile,
  })
  @ApiResponse({ status: 404, description: 'Knowledge not found.' })
  @ApiResponse({ status: 409, description: 'File already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createKnowledgeFileDto: CreateKnowledgeFileDto,
  ): Promise<KnowledgeFile> {
    try {
      return await this.knowledgeFilesService.create(createKnowledgeFileDto);
    } catch (error) {
      // Re-throw HTTP exceptions as they are already properly formatted
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        'An unexpected error occurred while creating knowledge file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all knowledge files' })
  @ApiResponse({
    status: 200,
    description: 'Return all knowledge files.',
    type: [KnowledgeFile],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('knowledgeId') knowledgeId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<KnowledgeFile[]> {
    try {
      const where: Prisma.KnowledgeFileWhereInput = {};

      // Filter by knowledge ID if provided
      if (knowledgeId) {
        where.knowledgeId = knowledgeId;
      }

      // Filter by status if provided
      if (status) {
        where.status = status;
      }

      // Search functionality
      if (search) {
        where.OR = [
          { fileName: { contains: search, mode: 'insensitive' as const } },
          { fileType: { contains: search, mode: 'insensitive' as const } },
        ];
      }

      return await this.knowledgeFilesService.findMany({
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
        'An unexpected error occurred while fetching knowledge files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a knowledge file by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the knowledge file.',
    type: KnowledgeFile,
  })
  @ApiResponse({ status: 404, description: 'Knowledge file not found.' })
  async findOne(@Param('id') id: string): Promise<KnowledgeFile | null> {
    try {
      const knowledgeFile = await this.knowledgeFilesService.findOne({ id });
      if (!knowledgeFile) {
        throw new HttpException(
          'Knowledge file not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return knowledgeFile;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching knowledge file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('knowledge/:knowledgeId')
  @ApiOperation({ summary: 'Get all files for a specific knowledge' })
  @ApiResponse({
    status: 200,
    description: 'Return all files for the knowledge.',
    type: [KnowledgeFile],
  })
  async findByKnowledge(
    @Param('knowledgeId') knowledgeId: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ): Promise<KnowledgeFile[]> {
    try {
      return await this.knowledgeFilesService.findMany({
        skip,
        take: take || 10,
        where: { knowledgeId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching knowledge files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a knowledge file' })
  @ApiResponse({
    status: 200,
    description: 'The knowledge file has been successfully updated.',
    type: KnowledgeFile,
  })
  @ApiResponse({ status: 404, description: 'Knowledge file not found.' })
  @ApiResponse({ status: 409, description: 'File already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateKnowledgeFileDto: UpdateKnowledgeFileDto,
  ): Promise<KnowledgeFile> {
    try {
      return await this.knowledgeFilesService.update(
        { id },
        updateKnowledgeFileDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while updating knowledge file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a knowledge file' })
  @ApiResponse({
    status: 204,
    description: 'The knowledge file has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Knowledge file not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.knowledgeFilesService.delete({ id });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while deleting knowledge file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
