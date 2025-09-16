import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from '../generated/prisma/client';

describe('CustomersService', () => {
  let service: CustomersService;

  const mockCustomer: Customer = {
    id: 'test-customer-uuid-123',
    name: 'PT. Teknologi Maju',
    email: 'contact@teknologimaju.com',
    phone: '+628123456789',
    address: 'Jl. Sudirman No. 123, Jakarta',
    industry: 'Technology',
    description: 'Leading technology company providing innovative solutions',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCachesService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const mockConfigsService = {
    cachePrefixCustomers: 'customers',
    cacheTtlCustomers: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CachesService,
          useValue: mockCachesService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached customer when found in cache', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockCustomer);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockCustomer);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customers:findOne:id:test-customer-uuid-123',
      );
      expect(mockPrismaService.customer.findUnique).not.toHaveBeenCalled();
    });

    it('should return customer from database and cache it when not in cache', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockCustomer);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customers:findOne:id:test-customer-uuid-123',
      );
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customers:findOne:id:test-customer-uuid-123',
        mockCustomer,
        3600,
      );
    });

    it('should return null when customer not found and not cache null result', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customers:findOne:id:non-existent-uuid',
      );
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return array of customers with default parameters', async () => {
      const customers = [mockCustomer];
      mockPrismaService.customer.findMany.mockResolvedValue(customers);

      const result = await service.findMany({});

      expect(result).toEqual(customers);
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return array of customers with custom parameters', async () => {
      const customers = [mockCustomer];
      const params = {
        skip: 0,
        take: 10,
        cursor: { id: 'test-customer-uuid-123' },
        where: { name: { contains: 'Teknologi' } },
        orderBy: { createdAt: 'desc' as const },
      };
      mockPrismaService.customer.findMany.mockResolvedValue(customers);

      const result = await service.findMany(params);

      expect(result).toEqual(customers);
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(params);
    });
  });

  describe('create', () => {
    const createCustomerDto: CreateCustomerDto = {
      name: 'PT. Teknologi Maju',
      email: 'contact@teknologimaju.com',
      phone: '+628123456789',
      address: 'Jl. Sudirman No. 123, Jakarta',
      industry: 'Technology',
      description: 'Leading technology company providing innovative solutions',
      isActive: true,
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
    });

    it('should create a customer and cache it', async () => {
      mockPrismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create(createCustomerDto);

      expect(result).toEqual(mockCustomer);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'PT. Teknologi Maju',
          email: 'contact@teknologimaju.com',
          phone: '+628123456789',
          address: 'Jl. Sudirman No. 123, Jakarta',
          industry: 'Technology',
          description:
            'Leading technology company providing innovative solutions',
          isActive: true,
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customers:findOne:id:test-customer-uuid-123',
        mockCustomer,
        3600,
      );
    });

    it('should create a customer with default isActive true when not provided', async () => {
      const dtoWithoutIsActive = { ...createCustomerDto };
      delete dtoWithoutIsActive.isActive;

      mockPrismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create(dtoWithoutIsActive);

      expect(result).toEqual(mockCustomer);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'PT. Teknologi Maju',
          email: 'contact@teknologimaju.com',
          phone: '+628123456789',
          address: 'Jl. Sudirman No. 123, Jakarta',
          industry: 'Technology',
          description:
            'Leading technology company providing innovative solutions',
          isActive: true,
        },
      });
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };
      mockPrismaService.customer.create.mockRejectedValue(prismaError);

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createCustomerDto)).rejects.toThrow(
        'email already exists',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.customer.create.mockRejectedValue(prismaError);

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(createCustomerDto)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const error = new Error('Custom error');
      mockPrismaService.customer.create.mockRejectedValue(error);

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        'Custom error',
      );
    });
  });

  describe('update', () => {
    const updateCustomerDto: UpdateCustomerDto = {
      name: 'PT. Teknologi Maju Updated',
      description: 'Updated leading technology company',
      isActive: false,
    };

    const updatedCustomer: Customer = {
      ...mockCustomer,
      name: 'PT. Teknologi Maju Updated',
      description: 'Updated leading technology company',
      isActive: false,
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should update a customer and update cache', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(whereInput, updateCustomerDto);

      expect(result).toEqual(updatedCustomer);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
        where: whereInput,
        data: {
          name: 'PT. Teknologi Maju Updated',
          email: undefined,
          phone: undefined,
          address: undefined,
          industry: undefined,
          description: 'Updated leading technology company',
          isActive: false,
        },
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'customers:findOne:id:test-customer-uuid-123',
      );
      // Check new cache entry
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customers:findOne:id:test-customer-uuid-123',
        updatedCustomer,
        3600,
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow('Customer not found');
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow('email already exists');
    });

    it('should throw NotFoundException on record not found during update', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow('Customer not found');
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(whereInput, updateCustomerDto),
      ).rejects.toThrow('Database operation failed');
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should delete a customer successfully and invalidate cache', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.delete.mockResolvedValue(mockCustomer);

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockCustomer);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.customer.delete).toHaveBeenCalledWith({
        where: whereInput,
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'customers:findOne:id:test-customer-uuid-123',
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Customer not found',
      );
    });

    it('should throw NotFoundException on record not found during delete', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Customer not found',
      );
    });

    it('should throw ConflictException on foreign key constraint violation', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      const prismaError = {
        code: 'P2003',
        meta: {},
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Cannot delete customer as it is being used by other entities',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-customer-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customer.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });
});
