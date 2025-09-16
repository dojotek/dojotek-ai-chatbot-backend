import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeFile, Prisma } from '../generated/prisma/client';
import { CreateKnowledgeFileDto } from './dto/create-knowledge-file.dto';
import { UpdateKnowledgeFileDto } from './dto/update-knowledge-file.dto';
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
export class KnowledgeFilesService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
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
  ): Promise<KnowledgeFile> {
    try {
      // Check if knowledge exists
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id: createKnowledgeFileDto.knowledgeId },
      });

      if (!knowledge) {
        throw new NotFoundException('Knowledge not found');
      }

      const knowledgeFile = await this.prisma.knowledgeFile.create({
        data: {
          ...createKnowledgeFileDto,
          status: createKnowledgeFileDto.status || 'pending',
          isActive: createKnowledgeFileDto.isActive ?? true,
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

      return knowledgeFile;
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
}
