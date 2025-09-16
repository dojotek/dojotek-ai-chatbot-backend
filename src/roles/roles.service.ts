import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Prisma } from '../generated/prisma/client';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
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
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    roleWhereUniqueInput: Prisma.RoleWhereUniqueInput,
  ): Promise<Role | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey('findOne', roleWhereUniqueInput);

    // Try to get from cache first
    const cachedRole = await this.cachesService.get<Role>(cacheKey);
    if (cachedRole) {
      return cachedRole;
    }

    // If not in cache, get from database
    const role = await this.prisma.role.findUnique({
      where: roleWhereUniqueInput,
    });

    // Cache the result if role exists
    if (role) {
      await this.cachesService.set(
        cacheKey,
        role,
        this.configsService.cacheTtlRoles,
      );
    }

    return role;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.RoleWhereUniqueInput;
    where?: Prisma.RoleWhereInput;
    orderBy?: Prisma.RoleOrderByWithRelationInput;
  }): Promise<Role[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.role.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      const role = await this.prisma.role.create({
        data: {
          name: createRoleDto.name,
          description: createRoleDto.description,
          permissions: createRoleDto.permissions,
        },
      });

      // Cache the newly created role
      const cacheKey = this.generateCacheKey('findOne', { id: role.id });
      await this.cachesService.set(
        cacheKey,
        role,
        this.configsService.cacheTtlRoles,
      );

      // Also cache by name if it exists
      if (role.name) {
        const nameCacheKey = this.generateCacheKey('findOne', {
          name: role.name,
        });
        await this.cachesService.set(
          nameCacheKey,
          role,
          this.configsService.cacheTtlRoles,
        );
      }

      return role;
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
    where: Prisma.RoleWhereUniqueInput,
    updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    try {
      // Get the current role first to handle cache invalidation
      const existingRole = await this.prisma.role.findUnique({ where });
      if (!existingRole) {
        throw new NotFoundException('Role not found');
      }

      const updatedRole = await this.prisma.role.update({
        data: {
          name: updateRoleDto.name,
          description: updateRoleDto.description,
          permissions: updateRoleDto.permissions,
        },
        where,
      });

      // Invalidate old cache entries
      await this.invalidateRoleCache(existingRole);

      // Cache the updated role
      const cacheKey = this.generateCacheKey('findOne', { id: updatedRole.id });
      await this.cachesService.set(
        cacheKey,
        updatedRole,
        this.configsService.cacheTtlRoles,
      );

      // Also cache by name if it exists
      if (updatedRole.name) {
        const nameCacheKey = this.generateCacheKey('findOne', {
          name: updatedRole.name,
        });
        await this.cachesService.set(
          nameCacheKey,
          updatedRole,
          this.configsService.cacheTtlRoles,
        );
      }

      return updatedRole;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Role not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async delete(where: Prisma.RoleWhereUniqueInput): Promise<Role> {
    try {
      // Get the role first to handle cache invalidation
      const roleToDelete = await this.prisma.role.findUnique({ where });
      if (!roleToDelete) {
        throw new NotFoundException('Role not found');
      }

      const deletedRole = await this.prisma.role.delete({
        where,
      });

      // Invalidate cache entries
      await this.invalidateRoleCache(roleToDelete);

      return deletedRole;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Role not found');
      }

      // Handle foreign key constraint violation
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete role as it is being used by users',
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

  /**
   * Generate cache key for role operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.RoleWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixRoles;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }
    if (params.name) {
      keyParts.push(`name:${params.name}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a role
   */
  private async invalidateRoleCache(role: Role): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: role.id }),
    ];

    if (role.name) {
      cacheKeysToDelete.push(
        this.generateCacheKey('findOne', { name: role.name }),
      );
    }

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
