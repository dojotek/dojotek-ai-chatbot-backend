import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Customer, Prisma } from '../generated/prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
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
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  async findOne(
    customerWhereUniqueInput: Prisma.CustomerWhereUniqueInput,
  ): Promise<Customer | null> {
    // Generate cache key based on the unique input
    const cacheKey = this.generateCacheKey('findOne', customerWhereUniqueInput);

    // Try to get from cache first
    const cachedCustomer = await this.cachesService.get<Customer>(cacheKey);
    if (cachedCustomer) {
      return cachedCustomer;
    }

    // If not in cache, get from database
    const customer = await this.prisma.customer.findUnique({
      where: customerWhereUniqueInput,
    });

    // Cache the result if customer exists
    if (customer) {
      await this.cachesService.set(
        cacheKey,
        customer,
        this.configsService.cacheTtlCustomers,
      );
    }

    return customer;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.CustomerWhereUniqueInput;
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput;
  }): Promise<Customer[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.customer.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    try {
      const customer = await this.prisma.customer.create({
        data: {
          name: createCustomerDto.name,
          email: createCustomerDto.email,
          phone: createCustomerDto.phone,
          address: createCustomerDto.address,
          industry: createCustomerDto.industry,
          description: createCustomerDto.description,
          isActive: createCustomerDto.isActive ?? true,
        },
      });

      // Cache the newly created customer
      const cacheKey = this.generateCacheKey('findOne', { id: customer.id });
      await this.cachesService.set(
        cacheKey,
        customer,
        this.configsService.cacheTtlCustomers,
      );

      return customer;
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
    where: Prisma.CustomerWhereUniqueInput,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    try {
      // Get the current customer first to handle cache invalidation
      const existingCustomer = await this.prisma.customer.findUnique({ where });
      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      const updatedCustomer = await this.prisma.customer.update({
        data: {
          name: updateCustomerDto.name,
          email: updateCustomerDto.email,
          phone: updateCustomerDto.phone,
          address: updateCustomerDto.address,
          industry: updateCustomerDto.industry,
          description: updateCustomerDto.description,
          isActive: updateCustomerDto.isActive,
        },
        where,
      });

      // Invalidate old cache entries
      await this.invalidateCustomerCache(existingCustomer);

      // Cache the updated customer
      const cacheKey = this.generateCacheKey('findOne', {
        id: updatedCustomer.id,
      });
      await this.cachesService.set(
        cacheKey,
        updatedCustomer,
        this.configsService.cacheTtlCustomers,
      );

      return updatedCustomer;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Customer not found');
      }

      // Handle other Prisma errors
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }

      // Re-throw other errors
      throw error;
    }
  }

  async delete(where: Prisma.CustomerWhereUniqueInput): Promise<Customer> {
    try {
      // Get the customer first to handle cache invalidation
      const customerToDelete = await this.prisma.customer.findUnique({ where });
      if (!customerToDelete) {
        throw new NotFoundException('Customer not found');
      }

      const deletedCustomer = await this.prisma.customer.delete({
        where,
      });

      // Invalidate cache entries
      await this.invalidateCustomerCache(customerToDelete);

      return deletedCustomer;
    } catch (error) {
      // Handle record not found
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Customer not found');
      }

      // Handle foreign key constraint violation
      if (isPrismaError(error) && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete customer as it is being used by other entities',
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
   * Generate cache key for customer operations
   */
  private generateCacheKey(
    operation: string,
    params: Prisma.CustomerWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixCustomers;
    const keyParts = [prefix, operation];

    // Add parameters to key
    if (params.id) {
      keyParts.push(`id:${params.id}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate all cache entries for a customer
   */
  private async invalidateCustomerCache(customer: Customer): Promise<void> {
    const cacheKeysToDelete = [
      this.generateCacheKey('findOne', { id: customer.id }),
    ];

    // Delete all cache keys
    await Promise.all(
      cacheKeysToDelete.map((key) => this.cachesService.del(key)),
    );
  }
}
