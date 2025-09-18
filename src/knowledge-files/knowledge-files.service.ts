import {
  Injectable,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeFile, Prisma } from '../generated/prisma/client';
import { CreateKnowledgeFileDto } from './dto/create-knowledge-file.dto';
import { UpdateKnowledgeFileDto } from './dto/update-knowledge-file.dto';
import { AcknowledgeUploadDto } from './dto/acknowledge-upload.dto';
import { CreateKnowledgeFileResponseDto } from './dto/create-knowledge-file-response.dto';
import { PlaygroundQueryDto } from './dto/playground-query.dto';
import {
  PlaygroundResponseDto,
  FileChunkDto,
} from './dto/playground-response.dto';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { LogsService } from '../logs/logs.service';
import type { IStorageService } from '../storage/storage.interface';
import { STORAGE_SERVICE } from '../storage/constants';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';

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
export class KnowledgeFilesService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
    private logsService: LogsService,

    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,

    @InjectQueue('knowledge-files/vectorize')
    private vectorizeQueue: Queue,
  ) {}

  async findOne(
    knowledgeFileWhereUniqueInput: Prisma.KnowledgeFileWhereUniqueInput,
  ): Promise<KnowledgeFile | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      knowledgeFileWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedKnowledgeFile =
      await this.cachesService.get<KnowledgeFile>(cacheKey);
    if (cachedKnowledgeFile) {
      return cachedKnowledgeFile;
    }

    // If not in cache, get from database
    const knowledgeFile = await this.prisma.knowledgeFile.findUnique({
      where: knowledgeFileWhereUniqueInput,
      include: {
        knowledge: true,
      },
    });

    // Cache the result if knowledge file exists
    if (knowledgeFile) {
      await this.cachesService.set(
        cacheKey,
        knowledgeFile,
        this.configsService.cacheTtlKnowledgeFiles,
      );
    }

    return knowledgeFile;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.KnowledgeFileWhereUniqueInput;
    where?: Prisma.KnowledgeFileWhereInput;
    orderBy?: Prisma.KnowledgeFileOrderByWithRelationInput;
  }): Promise<KnowledgeFile[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.knowledgeFile.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        knowledge: true,
      },
    });
  }

  async create(
    createKnowledgeFileDto: CreateKnowledgeFileDto,
  ): Promise<CreateKnowledgeFileResponseDto> {
    try {
      // Check if knowledge exists
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id: createKnowledgeFileDto.knowledgeId },
      });

      if (!knowledge) {
        throw new NotFoundException('Knowledge not found');
      }

      // Generate storage key with format: knowledge-files/YYYY-MM-DD/UUID.EXT
      const now = new Date();
      const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const fileExtension = path
        .extname(createKnowledgeFileDto.fileName)
        .toLowerCase();
      const fileUuid = randomUUID();
      const storageKey = `knowledge-files/${dateString}/${fileUuid}${fileExtension}`;

      // Determine file type if not provided
      const fileType =
        createKnowledgeFileDto.fileType ||
        this.getContentTypeFromExtension(fileExtension);

      // Generate presigned upload URL
      const presignedResult = await this.storageService.presignUpload({
        key: storageKey,
        contentType: fileType,
        expiresInMinutes: 60, // 1 hour expiration
      });

      const knowledgeFile = await this.prisma.knowledgeFile.create({
        data: {
          knowledgeId: createKnowledgeFileDto.knowledgeId,
          fileName: createKnowledgeFileDto.fileName,
          fileUrl: storageKey, // Store the storage key as fileUrl for now
          fileType,
          fileSize: createKnowledgeFileDto.fileSize,
          status: createKnowledgeFileDto.status || 'pending',
          isActive: false,
        },
        include: {
          knowledge: true,
        },
      });

      // Cache the newly created knowledge file
      const cacheKey = this.generateCacheKey('findOne', {
        id: knowledgeFile.id,
      });
      await this.cachesService.set(
        cacheKey,
        knowledgeFile,
        this.configsService.cacheTtlKnowledgeFiles,
      );

      return {
        knowledgeFile,
        uploadUrl: presignedResult.url,
        storageKey,
        method: presignedResult.method,
        expiresInMinutes: presignedResult.expiresInMinutes || 60,
      };
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle foreign key constraint violation
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Knowledge not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async acknowledgeFileUploaded(
    acknowledgeUploadDto: AcknowledgeUploadDto,
  ): Promise<KnowledgeFile> {
    try {
      // Find the knowledge file
      const knowledgeFile = await this.prisma.knowledgeFile.findUnique({
        where: { id: acknowledgeUploadDto.id },
      });

      if (!knowledgeFile) {
        throw new NotFoundException('Knowledge file not found');
      }

      // Check if status is still pending
      if (knowledgeFile.status !== 'pending') {
        throw new BadRequestException(
          `Cannot acknowledge upload for file with status: ${knowledgeFile.status}`,
        );
      }

      // Update file size if provided
      const updatedKnowledgeFile = await this.prisma.knowledgeFile.update({
        where: { id: acknowledgeUploadDto.id },
        data: {
          fileSize: acknowledgeUploadDto.fileSize || knowledgeFile.fileSize,
        },
        include: {
          knowledge: true,
        },
      });

      // Add job to vectorization queue
      await this.vectorizeQueue.add(
        'vectorize-file',
        {
          knowledgeFileId: updatedKnowledgeFile.id,
          storageKey: updatedKnowledgeFile.fileUrl, // fileUrl contains the storage key
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      // Invalidate and update cache
      await this.invalidateKnowledgeFileCache(knowledgeFile);
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedKnowledgeFile.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedKnowledgeFile,
        this.configsService.cacheTtlKnowledgeFiles,
      );

      return updatedKnowledgeFile;
    } catch (error) {
      // Handle Prisma errors
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Knowledge file not found');
      }

      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async update(
    where: Prisma.KnowledgeFileWhereUniqueInput,
    updateKnowledgeFileDto: UpdateKnowledgeFileDto,
  ): Promise<KnowledgeFile> {
    try {
      // Get the current knowledge file first to handle cache invalidation
      const existingKnowledgeFile = await this.prisma.knowledgeFile.findUnique({
        where,
      });

      if (!existingKnowledgeFile) {
        throw new NotFoundException('Knowledge file not found');
      }

      // If knowledgeId is being updated, check if new knowledge exists
      if (updateKnowledgeFileDto.knowledgeId) {
        const knowledge = await this.prisma.knowledge.findUnique({
          where: { id: updateKnowledgeFileDto.knowledgeId },
        });

        if (!knowledge) {
          throw new NotFoundException('Knowledge not found');
        }
      }

      const updatedKnowledgeFile = await this.prisma.knowledgeFile.update({
        data: updateKnowledgeFileDto,
        where,
        include: {
          knowledge: true,
        },
      });

      // Invalidate old cache entries
      await this.invalidateKnowledgeFileCache(existingKnowledgeFile);

      // Cache the updated knowledge file
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedKnowledgeFile.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedKnowledgeFile,
        this.configsService.cacheTtlKnowledgeFiles,
      );

      return updatedKnowledgeFile;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Knowledge file not found');
      }

      // Handle foreign key constraint violation
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Knowledge not found');
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
    where: Prisma.KnowledgeFileWhereUniqueInput,
  ): Promise<KnowledgeFile> {
    try {
      // Get the knowledge file first to handle cache invalidation
      const knowledgeFileToDelete = await this.prisma.knowledgeFile.findUnique({
        where,
      });

      if (!knowledgeFileToDelete) {
        throw new NotFoundException('Knowledge file not found');
      }

      const deletedKnowledgeFile = await this.prisma.knowledgeFile.delete({
        where,
        include: {
          knowledge: true,
        },
      });

      // Invalidate cache entries
      await this.invalidateKnowledgeFileCache(knowledgeFileToDelete);

      return deletedKnowledgeFile;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Knowledge file not found');
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
   * Generate cache key for knowledge file operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.KnowledgeFileWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixKnowledgeFiles;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Get content type from file extension
   */
  private getContentTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pdf': 'application/pdf',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Invalidate all cache entries for a knowledge file
   */
  private async invalidateKnowledgeFileCache(
    knowledgeFile: KnowledgeFile,
  ): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: knowledgeFile.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }

  async playground(
    playgroundQueryDto: PlaygroundQueryDto,
  ): Promise<PlaygroundResponseDto> {
    try {
      // Validate that the knowledge file exists
      const knowledgeFile = await this.findOne({
        id: playgroundQueryDto.knowledgeFileId,
      });

      if (!knowledgeFile) {
        throw new NotFoundException('Knowledge file not found');
      }

      // Check if the knowledge file is processed and active
      if (knowledgeFile.status !== 'processed') {
        throw new BadRequestException(
          `Knowledge file is not processed yet. Current status: ${knowledgeFile.status}`,
        );
      }

      if (!knowledgeFile.isActive) {
        throw new BadRequestException('Knowledge file is not active');
      }

      // Initialize OpenAI embeddings
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configsService.openaiApiKey,
        modelName: this.configsService.vectorModel,
      });

      // Create collection name based on knowledge
      const collectionName = `knowledge_${knowledgeFile.knowledgeId.replace(/-/g, '_')}`;

      // Initialize Qdrant vector store
      const vectorStore = new QdrantVectorStore(embeddings, {
        url: this.configsService.qdrantDatabaseUrl,
        collectionName,
      });

      // Perform similarity search with filtering for specific knowledge file
      const searchResults = await vectorStore.similaritySearchWithScore(
        playgroundQueryDto.query,
        3, // Return top 10 results
        {
          must: [
            {
              key: 'metadata.knowledgeFileId',
              match: {
                value: playgroundQueryDto.knowledgeFileId,
              },
            },
          ],
        },
      );

      // Transform search results to FileChunkDto format
      const fileChunks: FileChunkDto[] = searchResults.map(
        ([document, score]) => ({
          content: document.pageContent,
          score: score,
          metadata: document.metadata,
        }),
      );

      this.logsService.log(
        `Playground search completed for knowledge file ${playgroundQueryDto.knowledgeFileId}. Found ${fileChunks.length} chunks for query: "${playgroundQueryDto.query}"`,
        KnowledgeFilesService.name,
      );

      return {
        fileChunkQuantity: fileChunks.length,
        fileChunks,
      };
    } catch (error) {
      this.logsService.error(
        `Playground search failed for knowledge file ${playgroundQueryDto.knowledgeFileId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        KnowledgeFilesService.name,
      );

      // Re-throw HTTP exceptions as they are already properly formatted
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle other errors
      throw new InternalServerErrorException(
        'An error occurred while searching the knowledge file',
      );
    }
  }
}
