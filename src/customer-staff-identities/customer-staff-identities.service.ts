import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStaffIdentity, Prisma } from '../generated/prisma/client';
import { CreateCustomerStaffIdentityDto } from './dto/create-customer-staff-identity.dto';
import { UpdateCustomerStaffIdentityDto } from './dto/update-customer-staff-identity.dto';
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
export class CustomerStaffIdentitiesService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    customerStaffIdentityWhereUniqueInput: Prisma.CustomerStaffIdentityWhereUniqueInput,
  ): Promise<CustomerStaffIdentity | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      customerStaffIdentityWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedCustomerStaffIdentity =
      await this.cachesService.get<CustomerStaffIdentity>(cacheKey);
    if (cachedCustomerStaffIdentity) {
      return cachedCustomerStaffIdentity;
    }

    // If not in cache, get from database
    const customerStaffIdentity =
      await this.prisma.customerStaffIdentity.findUnique({
        where: customerStaffIdentityWhereUniqueInput,
      });

    // Cache the result if customerStaffIdentity exists
    if (customerStaffIdentity) {
      await this.cachesService.set(
        cacheKey,
        customerStaffIdentity,
        this.configsService.cacheTtlCustomerStaffIdentities,
      );
    }

    return customerStaffIdentity;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.CustomerStaffIdentityWhereUniqueInput;
    where?: Prisma.CustomerStaffIdentityWhereInput;
    orderBy?: Prisma.CustomerStaffIdentityOrderByWithRelationInput;
  }): Promise<CustomerStaffIdentity[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.customerStaffIdentity.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(
    createCustomerStaffIdentityDto: CreateCustomerStaffIdentityDto,
  ): Promise<CustomerStaffIdentity> {
    try {
      const customerStaffIdentity =
        await this.prisma.customerStaffIdentity.create({
          data: {
            customerStaffId: createCustomerStaffIdentityDto.customerStaffId,
            platform: createCustomerStaffIdentityDto.platform,
            platformUserId: createCustomerStaffIdentityDto.platformUserId,
            platformData: createCustomerStaffIdentityDto.platformData,
            isActive: createCustomerStaffIdentityDto.isActive ?? true,
          },
        });

      // Cache the newly created customerStaffIdentity
      const cacheKey = this.generateCacheKey('findOne', {
        id: customerStaffIdentity.id,
      });
      await this.cachesService.set(
        cacheKey,
        customerStaffIdentity,
        this.configsService.cacheTtlCustomerStaffIdentities,
      );

      return customerStaffIdentity;
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
    where: Prisma.CustomerStaffIdentityWhereUniqueInput,
    updateCustomerStaffIdentityDto: UpdateCustomerStaffIdentityDto,
  ): Promise<CustomerStaffIdentity> {
    try {
      // Get the current customerStaffIdentity first to handle cache invalidation
      const existingCustomerStaffIdentity =
        await this.prisma.customerStaffIdentity.findUnique({ where });
      if (!existingCustomerStaffIdentity) {
        throw new NotFoundException('Customer staff identity not found');
      }

      const updatedCustomerStaffIdentity =
        await this.prisma.customerStaffIdentity.update({
          data: {
            customerStaffId: updateCustomerStaffIdentityDto.customerStaffId,
            platform: updateCustomerStaffIdentityDto.platform,
            platformUserId: updateCustomerStaffIdentityDto.platformUserId,
            platformData: updateCustomerStaffIdentityDto.platformData,
            isActive: updateCustomerStaffIdentityDto.isActive,
          },
          where,
        });

      // Invalidate old cache entries
      await this.invalidateCustomerStaffIdentityCache(
        existingCustomerStaffIdentity,
      );

      // Cache the updated customerStaffIdentity
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedCustomerStaffIdentity.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedCustomerStaffIdentity,
        this.configsService.cacheTtlCustomerStaffIdentities,
      );

      return updatedCustomerStaffIdentity;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Customer staff identity not found');
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
    where: Prisma.CustomerStaffIdentityWhereUniqueInput,
  ): Promise<CustomerStaffIdentity> {
    try {
      // Get the customerStaffIdentity first to handle cache invalidation
      const customerStaffIdentityToDelete =
        await this.prisma.customerStaffIdentity.findUnique({ where });
      if (!customerStaffIdentityToDelete) {
        throw new NotFoundException('Customer staff identity not found');
      }

      const deletedCustomerStaffIdentity =
        await this.prisma.customerStaffIdentity.delete({
          where,
        });

      // Invalidate cache entries
      await this.invalidateCustomerStaffIdentityCache(
        customerStaffIdentityToDelete,
      );

      return deletedCustomerStaffIdentity;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Customer staff identity not found');
      }

      // Handle foreign key constraint violation
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete customer staff identity as it is being used by other entities',
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
   * Generate cache key for customer staff identity operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.CustomerStaffIdentityWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixCustomerStaffIdentities;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a customer staff identity
   */
  private async invalidateCustomerStaffIdentityCache(
    customerStaffIdentity: CustomerStaffIdentity,
  ): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: customerStaffIdentity.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
