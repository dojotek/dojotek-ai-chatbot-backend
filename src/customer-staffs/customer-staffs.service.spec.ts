import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CustomerStaffsService } from './customer-staffs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateCustomerStaffDto } from './dto/create-customer-staff.dto';
import { UpdateCustomerStaffDto } from './dto/update-customer-staff.dto';
import { CustomerStaff } from '../generated/prisma/client';

describe('CustomerStaffsService', () => {
  let service: CustomerStaffsService;

  const mockCustomerStaff: CustomerStaff = {
    id: 'test-uuid-123',
    customerId: 'test-customer-id',
    name: 'Test Staff',
    email: 'test@company.com',
    phone: '+628123456789',
    department: 'IT',
    position: 'Software Engineer',
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockPrismaService = {
    customerStaff: {
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
    cachePrefixCustomerStaffs: 'customer-staffs',
    cacheTtlCustomerStaffs: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerStaffsService,
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

    service = module.get<CustomerStaffsService>(CustomerStaffsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    const whereInput = { id: 'test-uuid-123' };

    it('should return cached customer staff when found in cache', async () => {
      mockCachesService.get.mockResolvedValue(mockCustomerStaff);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockCustomerStaff);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.customerStaff.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not found in cache', async () => {
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockCustomerStaff);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.customerStaff.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
        mockCustomerStaff,
        3600,
      );
    });

    it('should return null when customer staff not found and not cache null result', async () => {
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    const findManyParams = {
      skip: 0,
      take: 10,
      where: { customerId: 'test-customer-id' },
      orderBy: { createdAt: 'desc' as const },
    };

    it('should return multiple customer staffs', async () => {
      const customerStaffs = [mockCustomerStaff];
      mockPrismaService.customerStaff.findMany.mockResolvedValue(
        customerStaffs,
      );

      const result = await service.findMany(findManyParams);

      expect(result).toEqual(customerStaffs);
      expect(mockPrismaService.customerStaff.findMany).toHaveBeenCalledWith(
        findManyParams,
      );
    });

    it('should handle empty parameters', async () => {
      mockPrismaService.customerStaff.findMany.mockResolvedValue([]);

      const result = await service.findMany({});

      expect(result).toEqual([]);
      expect(mockPrismaService.customerStaff.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });
  });

  describe('create', () => {
    const createCustomerStaffDto: CreateCustomerStaffDto = {
      customerId: 'test-customer-id',
      name: 'Test Staff',
      email: 'test@company.com',
      phone: '+628123456789',
      department: 'IT',
      position: 'Software Engineer',
    };

    it('should create a customer staff and cache it', async () => {
      mockPrismaService.customerStaff.create.mockResolvedValue(
        mockCustomerStaff,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.create(createCustomerStaffDto);

      expect(result).toEqual(mockCustomerStaff);
      expect(mockPrismaService.customerStaff.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Staff',
          email: 'test@company.com',
          phone: '+628123456789',
          department: 'IT',
          position: 'Software Engineer',
          customer: {
            connect: {
              id: 'test-customer-id',
            },
          },
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
        mockCustomerStaff,
        3600,
      );
    });

    it('should handle unique constraint violation (P2002)', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };
      mockPrismaService.customerStaff.create.mockRejectedValue(prismaError);

      await expect(service.create(createCustomerStaffDto)).rejects.toThrow(
        new ConflictException('email already exists'),
      );
    });

    it('should handle unique constraint violation without target field', async () => {
      const prismaError = {
        code: 'P2002',
        meta: {},
      };
      mockPrismaService.customerStaff.create.mockRejectedValue(prismaError);

      await expect(service.create(createCustomerStaffDto)).rejects.toThrow(
        new ConflictException('field already exists'),
      );
    });

    it('should handle foreign key constraint failure (P2003)', async () => {
      const prismaError = {
        code: 'P2003',
      };
      mockPrismaService.customerStaff.create.mockRejectedValue(prismaError);

      await expect(service.create(createCustomerStaffDto)).rejects.toThrow(
        new ConflictException('Customer not found'),
      );
    });

    it('should handle other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
      };
      mockPrismaService.customerStaff.create.mockRejectedValue(prismaError);

      await expect(service.create(createCustomerStaffDto)).rejects.toThrow(
        new InternalServerErrorException('Database operation failed'),
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const genericError = new Error('Generic error');
      mockPrismaService.customerStaff.create.mockRejectedValue(genericError);

      await expect(service.create(createCustomerStaffDto)).rejects.toThrow(
        genericError,
      );
    });
  });

  describe('update', () => {
    const whereInput = { id: 'test-uuid-123' };
    const updateCustomerStaffDto: UpdateCustomerStaffDto = {
      name: 'Updated Staff',
      email: 'updated@company.com',
      customerId: 'new-customer-id',
    };

    const updatedCustomerStaff: CustomerStaff = {
      ...mockCustomerStaff,
      name: 'Updated Staff',
      email: 'updated@company.com',
      customerId: 'new-customer-id',
    };

    it('should update a customer staff and invalidate cache', async () => {
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.update.mockResolvedValue(
        updatedCustomerStaff,
      );
      mockCachesService.del.mockResolvedValue(1);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update(whereInput, updateCustomerStaffDto);

      expect(result).toEqual(updatedCustomerStaff);
      expect(mockPrismaService.customerStaff.update).toHaveBeenCalledWith({
        data: {
          name: 'Updated Staff',
          email: 'updated@company.com',
          customer: {
            connect: {
              id: 'new-customer-id',
            },
          },
        },
        where: whereInput,
      });
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
      );
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
        updatedCustomerStaff,
        3600,
      );
    });

    it('should update without customerId', async () => {
      const updateDto = { name: 'Updated Staff' };
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.update.mockResolvedValue(
        updatedCustomerStaff,
      );
      mockCachesService.del.mockResolvedValue(1);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update(whereInput, updateDto);

      expect(result).toEqual(updatedCustomerStaff);
      expect(mockPrismaService.customerStaff.update).toHaveBeenCalledWith({
        data: {
          name: 'Updated Staff',
        },
        where: whereInput,
      });
    });

    it('should handle unique constraint violation (P2002)', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateCustomerStaffDto),
      ).rejects.toThrow(new ConflictException('email already exists'));
    });

    it('should handle record not found (P2025)', async () => {
      const prismaError = {
        code: 'P2025',
      };
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(null);
      mockPrismaService.customerStaff.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateCustomerStaffDto),
      ).rejects.toThrow(new ConflictException('Customer staff not found'));
    });

    it('should handle foreign key constraint failure (P2003)', async () => {
      const prismaError = {
        code: 'P2003',
      };
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateCustomerStaffDto),
      ).rejects.toThrow(new ConflictException('Customer not found'));
    });

    it('should handle other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
      };
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.update.mockRejectedValue(prismaError);

      await expect(
        service.update(whereInput, updateCustomerStaffDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Database operation failed'),
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const genericError = new Error('Generic error');
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.update.mockRejectedValue(genericError);

      await expect(
        service.update(whereInput, updateCustomerStaffDto),
      ).rejects.toThrow(genericError);
    });

    it('should handle case when existing customer staff is not found during update', async () => {
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(null);
      mockPrismaService.customerStaff.update.mockResolvedValue(
        updatedCustomerStaff,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.update(whereInput, updateCustomerStaffDto);

      expect(result).toEqual(updatedCustomerStaff);
      expect(mockCachesService.del).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const whereInput = { id: 'test-uuid-123' };

    it('should delete a customer staff and invalidate cache', async () => {
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.delete.mockResolvedValue(
        mockCustomerStaff,
      );
      mockCachesService.del.mockResolvedValue(1);

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockCustomerStaff);
      expect(mockPrismaService.customerStaff.delete).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
      );
    });

    it('should handle record not found (P2025)', async () => {
      const prismaError = {
        code: 'P2025',
      };
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(null);
      mockPrismaService.customerStaff.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        new ConflictException('Customer staff not found'),
      );
    });

    it('should handle other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
      };
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        new InternalServerErrorException('Database operation failed'),
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const genericError = new Error('Generic error');
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(
        mockCustomerStaff,
      );
      mockPrismaService.customerStaff.delete.mockRejectedValue(genericError);

      await expect(service.delete(whereInput)).rejects.toThrow(genericError);
    });

    it('should handle case when customer staff to delete is not found during lookup', async () => {
      mockPrismaService.customerStaff.findUnique.mockResolvedValue(null);
      mockPrismaService.customerStaff.delete.mockResolvedValue(
        mockCustomerStaff,
      );

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockCustomerStaff);
      expect(mockCachesService.del).not.toHaveBeenCalled();
    });
  });
});
