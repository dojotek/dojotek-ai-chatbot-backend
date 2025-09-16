import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStaff, Prisma } from '../generated/prisma/client';
import { CreateCustomerStaffDto } from './dto/create-customer-staff.dto';
import { UpdateCustomerStaffDto } from './dto/update-customer-staff.dto';
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
export class CustomerStaffsService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    customerStaffWhereUniqueInput: Prisma.CustomerStaffWhereUniqueInput,
  ): Promise<CustomerStaff | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey(
      'findOne',
      customerStaffWhereUniqueInput,
    );

    // Try to get from cache first
    const cachedCustomerStaff =
      await this.cachesService.get<CustomerStaff>(cacheKey);
    if (cachedCustomerStaff) {
      return cachedCustomerStaff;
    }

    // If not in cache, get from database
    const customerStaff = await this.prisma.customerStaff.findUnique({
      where: customerStaffWhereUniqueInput,
    });

    // Cache the result if customerStaff exists
    if (customerStaff) {
      await this.cachesService.set(
        cacheKey,
        customerStaff,
        this.configsService.cacheTtlCustomerStaffs,
      );
    }

    return customerStaff;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.CustomerStaffWhereUniqueInput;
    where?: Prisma.CustomerStaffWhereInput;
    orderBy?: Prisma.CustomerStaffOrderByWithRelationInput;
  }): Promise<CustomerStaff[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.customerStaff.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(
    createCustomerStaffDto: CreateCustomerStaffDto,
  ): Promise<CustomerStaff> {
    try {
      const { customerId, ...customerStaffData } = createCustomerStaffDto;
      const customerStaff = await this.prisma.customerStaff.create({
        data: {
          ...customerStaffData,
          customer: {
            connect: {
              id: customerId,
            },
          },
        },
      });

      // Cache the newly created customerStaff
      const cacheKey = this.generateCacheKey('findOne', {
        id: customerStaff.id,
      });
      await this.cachesService.set(
        cacheKey,
        customerStaff,
        this.configsService.cacheTtlCustomerStaffs,
      );

      // Note: Email is not unique in CustomerStaff schema, so we don't cache by email

      return customerStaff;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle foreign key constraint failure (customer not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Customer not found');
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
    where: Prisma.CustomerStaffWhereUniqueInput,
    updateCustomerStaffDto: UpdateCustomerStaffDto,
  ): Promise<CustomerStaff> {
    try {
      // Get the current customerStaff first to handle cache invalidation
      const existingCustomerStaff = await this.prisma.customerStaff.findUnique({
        where,
      });

      // Prepare update data
      const { customerId, ...updateData } = updateCustomerStaffDto;
      const updateInput: Prisma.CustomerStaffUpdateInput = { ...updateData };

      // Handle customer relationship update if customerId is provided
      if (customerId) {
        updateInput.customer = {
          connect: {
            id: customerId,
          },
        };
      }

      const updatedCustomerStaff = await this.prisma.customerStaff.update({
        data: updateInput,
        where,
      });

      // Invalidate old cache entries
      if (existingCustomerStaff) {
        await this.invalidateCustomerStaffCache(existingCustomerStaff);
      }

      // Cache the updated customerStaff
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedCustomerStaff.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedCustomerStaff,
        this.configsService.cacheTtlCustomerStaffs,
      );

      // Note: Email is not unique in CustomerStaff schema, so we don't cache by email

      return updatedCustomerStaff;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('Customer staff not found');
      }

      // Handle foreign key constraint failure (customer not found)
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException('Customer not found');
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
    where: Prisma.CustomerStaffWhereUniqueInput,
  ): Promise<CustomerStaff> {
    try {
      // Get the customerStaff first to handle cache invalidation
      const customerStaffToDelete = await this.prisma.customerStaff.findUnique({
        where,
      });

      const deletedCustomerStaff = await this.prisma.customerStaff.delete({
        where,
      });

      // Invalidate cache entries
      if (customerStaffToDelete) {
        await this.invalidateCustomerStaffCache(customerStaffToDelete);
      }

      return deletedCustomerStaff;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new ConflictException('Customer staff not found');
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
   * Generate cache key for customerStaff operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.CustomerStaffWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixCustomerStaffs;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a customerStaff
   */
  private async invalidateCustomerStaffCache(
    customerStaff: CustomerStaff,
  ): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: customerStaff.id }),
    ];

    // Note: Email is not unique in CustomerStaff schema, so we don't cache by email

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
