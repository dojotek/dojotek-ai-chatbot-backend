import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey('findOne', userWhereUniqueInput);

    // Try to get from cache first
    const cachedUser = await this.cachesService.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    // If not in cache, get from database
    const user = await this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });

    // Cache the result if user exists
    if (user) {
      await this.cachesService.set(
        cacheKey,
        user,
        this.configsService.cacheTtlUsers,
      );
    }

    return user;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, roleId, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          role: {
            connect: {
              id: roleId,
            },
          },
        },
      });

      // Cache the newly created user
      const cacheKey = this.generateCacheKey('findOne', { id: user.id });
      await this.cachesService.set(
        cacheKey,
        user,
        this.configsService.cacheTtlUsers,
      );

      // Also cache by email if it exists
      if (user.email) {
        const emailCacheKey = this.generateCacheKey('findOne', {
          email: user.email,
        });
        await this.cachesService.set(
          emailCacheKey,
          user,
          this.configsService.cacheTtlUsers,
        );
      }

      return user;
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
    where: Prisma.UserWhereUniqueInput,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const { password, ...userData } = updateUserDto;

    const updateData: Prisma.UserUpdateInput = { ...userData };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    try {
      // Get the current user first to handle cache invalidation
      const existingUser = await this.prisma.user.findUnique({ where });

      const updatedUser = await this.prisma.user.update({
        data: updateData,
        where,
      });

      // Invalidate old cache entries
      if (existingUser) {
        await this.invalidateUserCache(existingUser);
      }

      // Cache the updated user
      const cacheKey = this.generateCacheKey('findOne', { id: updatedUser.id });
      await this.cachesService.set(
        cacheKey,
        updatedUser,
        this.configsService.cacheTtlUsers,
      );

      // Also cache by email if it exists
      if (updatedUser.email) {
        const emailCacheKey = this.generateCacheKey('findOne', {
          email: updatedUser.email,
        });
        await this.cachesService.set(
          emailCacheKey,
          updatedUser,
          this.configsService.cacheTtlUsers,
        );
      }

      return updatedUser;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('User not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async delete(where: Prisma.UserWhereUniqueInput): Promise<User> {
    try {
      // Get the user first to handle cache invalidation
      const userToDelete = await this.prisma.user.findUnique({ where });

      const deletedUser = await this.prisma.user.delete({
        where,
      });

      // Invalidate cache entries
      if (userToDelete) {
        await this.invalidateUserCache(userToDelete);
      }

      return deletedUser;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('User not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate cache key for user operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.UserWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixUsers;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }
    if (params.email) {
      keyParts.push(`email:${params.email}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a user
   */
  private async invalidateUserCache(user: User): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: user.id }),
    ];

    if (user.email) {
      cacheKeysToDelete.push(
        this.generateCacheKey('findOne', { email: user.email }),
      );
    }

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
