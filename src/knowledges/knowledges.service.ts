import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Knowledge, Prisma } from '../generated/prisma/client';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { PlaygroundQueryDto } from './dto/playground-query.dto';
import {
  PlaygroundResponseDto,
  FileChunkDto,
} from './dto/playground-response.dto';
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
export class KnowledgesService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    knowledgeWhereUniqueInput: Prisma.KnowledgeWhereUniqueInput,
  ): Promise<Knowledge | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      knowledgeWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedKnowledge = await this.cachesService.get<Knowledge>(cacheKey);
    if (cachedKnowledge) {
      return cachedKnowledge;
    }

    // If not in cache, get from database
    const knowledge = await this.prisma.knowledge.findUnique({
      where: knowledgeWhereUniqueInput,
    });

    // Cache the result if knowledge exists
    if (knowledge) {
      await this.cachesService.set(
        cacheKey,
        knowledge,
        this.configsService.cacheTtlKnowledges,
      );
    }

    return knowledge;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.KnowledgeWhereUniqueInput;
    where?: Prisma.KnowledgeWhereInput;
    orderBy?: Prisma.KnowledgeOrderByWithRelationInput;
  }): Promise<Knowledge[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.knowledge.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(createKnowledgeDto: CreateKnowledgeDto): Promise<Knowledge> {
    try {
      const knowledge = await this.prisma.knowledge.create({
        data: {
          name: createKnowledgeDto.name,
          description: createKnowledgeDto.description,
          category: createKnowledgeDto.category,
          isActive: createKnowledgeDto.isActive ?? true,
        },
      });

      // Cache the newly created knowledge
      const cacheKey = this.generateCacheKey('findOne', { id: knowledge.id });
      await this.cachesService.set(
        cacheKey,
        knowledge,
        this.configsService.cacheTtlKnowledges,
      );

      return knowledge;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
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
    where: Prisma.KnowledgeWhereUniqueInput,
    updateKnowledgeDto: UpdateKnowledgeDto,
  ): Promise<Knowledge> {
    try {
      // Get the current knowledge first to handle cache invalidation
      const existingKnowledge = await this.prisma.knowledge.findUnique({
        where,
      });
      if (!existingKnowledge) {
        throw new NotFoundException('Knowledge not found');
      }

      const updatedKnowledge = await this.prisma.knowledge.update({
        data: {
          name: updateKnowledgeDto.name,
          description: updateKnowledgeDto.description,
          category: updateKnowledgeDto.category,
          isActive: updateKnowledgeDto.isActive,
        },
        where,
      });

      // Invalidate old cache entries
      await this.invalidateKnowledgeCache(existingKnowledge);

      // Cache the updated knowledge
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedKnowledge.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedKnowledge,
        this.configsService.cacheTtlKnowledges,
      );

      return updatedKnowledge;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Knowledge not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async delete(where: Prisma.KnowledgeWhereUniqueInput): Promise<Knowledge> {
    try {
      // Get the knowledge first to handle cache invalidation
      const knowledgeToDelete = await this.prisma.knowledge.findUnique({
        where,
      });
      if (!knowledgeToDelete) {
        throw new NotFoundException('Knowledge not found');
      }

      const deletedKnowledge = await this.prisma.knowledge.delete({
        where,
      });

      // Invalidate cache entries
      await this.invalidateKnowledgeCache(knowledgeToDelete);

      return deletedKnowledge;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Knowledge not found');
      }

      // Handle foreign key constraint violation
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete knowledge as it is being used by chat agents or files',
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

  async playground(
    knowledgeId: string,
    playgroundQueryDto: PlaygroundQueryDto,
  ): Promise<PlaygroundResponseDto> {
    // Validate knowledge exists and active
    const knowledge = await this.prisma.knowledge.findUnique({
      where: { id: knowledgeId },
    });
    if (!knowledge) {
      throw new NotFoundException('Knowledge not found');
    }
    if (!knowledge.isActive) {
      throw new ConflictException('Knowledge is not active');
    }

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configsService.openaiApiKey,
      modelName: this.configsService.vectorModel,
    });

    // Qdrant collection for this knowledge
    const collectionName = `knowledge_${knowledgeId.replace(/-/g, '_')}`;
    const vectorStore = new QdrantVectorStore(embeddings, {
      url: this.configsService.qdrantDatabaseUrl,
      collectionName,
    });

    // Build filter: if knowledgeFileIds provided and non-empty, filter by them, else search across all files for this knowledge
    const hasSpecificFiles =
      Array.isArray(playgroundQueryDto.knowledgeFileIds) &&
      playgroundQueryDto.knowledgeFileIds.length > 0;

    const filter = hasSpecificFiles
      ? {
          must: [
            {
              key: 'metadata.knowledgeFileId',
              match: { any: playgroundQueryDto.knowledgeFileIds },
            },
          ],
        }
      : undefined;

    // Perform similarity search
    const results = await vectorStore.similaritySearchWithScore(
      playgroundQueryDto.query,
      3,
      filter,
    );

    const fileChunks: FileChunkDto[] = results.map(([doc, score]) => ({
      content: doc.pageContent,
      score,
      metadata: doc.metadata,
    }));

    return {
      fileChunkQuantity: fileChunks.length,
      fileChunks,
    };
  }

  /**
   * Generate cache key for knowledge operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.KnowledgeWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixKnowledges;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a knowledge
   */
  private async invalidateKnowledgeCache(knowledge: Knowledge): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: knowledge.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
