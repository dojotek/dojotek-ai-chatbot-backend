import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CustomerStaffIdentitiesService } from './customer-staff-identities.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateCustomerStaffIdentityDto } from './dto/create-customer-staff-identity.dto';
import { UpdateCustomerStaffIdentityDto } from './dto/update-customer-staff-identity.dto';
import { CustomerStaffIdentity } from '../generated/prisma/client';

describe('CustomerStaffIdentitiesService', () => {
  let service: CustomerStaffIdentitiesService;

  const mockCustomerStaffIdentity: CustomerStaffIdentity = {
    id: 'test-customer-staff-identity-uuid-123',
    customerStaffId: 'test-customer-staff-uuid-123',
    platform: 'slack',
    platformUserId: 'U1234567890',
    platformData: {
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    customerStaffIdentity: {
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
    cachePrefixCustomerStaffIdentities: 'customer-staff-identities',
    cacheTtlCustomerStaffIdentities: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerStaffIdentitiesService,
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

    service = module.get<CustomerStaffIdentitiesService>(
      CustomerStaffIdentitiesService,
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached customer staff identity when found in cache', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockCustomerStaffIdentity);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockCustomerStaffIdentity);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:test-customer-staff-identity-uuid-123',
      );
      expect(
        mockPrismaService.customerStaffIdentity.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('should return customer staff identity from database and cache it when not in cache', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockCustomerStaffIdentity);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:test-customer-staff-identity-uuid-123',
      );
      expect(
        mockPrismaService.customerStaffIdentity.findUnique,
      ).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:test-customer-staff-identity-uuid-123',
        mockCustomerStaffIdentity,
        3600,
      );
    });

    it('should return null when customer staff identity not found and not cache null result', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        null,
      );

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:non-existent-uuid',
      );
      expect(
        mockPrismaService.customerStaffIdentity.findUnique,
      ).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should return array of customer staff identities with default parameters', async () => {
      const customerStaffIdentities = [mockCustomerStaffIdentity];
      mockPrismaService.customerStaffIdentity.findMany.mockResolvedValue(
        customerStaffIdentities,
      );

      const result = await service.findMany({});

      expect(result).toEqual(customerStaffIdentities);
      expect(
        mockPrismaService.customerStaffIdentity.findMany,
      ).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return array of customer staff identities with custom parameters', async () => {
      const customerStaffIdentities = [mockCustomerStaffIdentity];
      const params = {
        skip: 0,
        take: 10,
        cursor: { id: 'test-customer-staff-identity-uuid-123' },
        where: { platform: { contains: 'slack' } },
        orderBy: { createdAt: 'desc' as const },
      };
      mockPrismaService.customerStaffIdentity.findMany.mockResolvedValue(
        customerStaffIdentities,
      );

      const result = await service.findMany(params);

      expect(result).toEqual(customerStaffIdentities);
      expect(
        mockPrismaService.customerStaffIdentity.findMany,
      ).toHaveBeenCalledWith(params);
    });
  });

  describe('create', () => {
    const createCustomerStaffIdentityDto: CreateCustomerStaffIdentityDto = {
      customerStaffId: 'test-customer-staff-uuid-123',
      platform: 'slack',
      platformUserId: 'U1234567890',
      platformData: {
        displayName: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
      },
      isActive: true,
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
    });

    it('should create a customer staff identity and cache it', async () => {
      mockPrismaService.customerStaffIdentity.create.mockResolvedValue(
        mockCustomerStaffIdentity,
      );

      const result = await service.create(createCustomerStaffIdentityDto);

      expect(result).toEqual(mockCustomerStaffIdentity);
      expect(
        mockPrismaService.customerStaffIdentity.create,
      ).toHaveBeenCalledWith({
        data: {
          customerStaffId: 'test-customer-staff-uuid-123',
          platform: 'slack',
          platformUserId: 'U1234567890',
          platformData: {
            displayName: 'John Doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          isActive: true,
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:test-customer-staff-identity-uuid-123',
        mockCustomerStaffIdentity,
        3600,
      );
    });

    it('should create a customer staff identity with default isActive true when not provided', async () => {
      const dtoWithoutIsActive = { ...createCustomerStaffIdentityDto };
      delete dtoWithoutIsActive.isActive;

      mockPrismaService.customerStaffIdentity.create.mockResolvedValue(
        mockCustomerStaffIdentity,
      );

      const result = await service.create(dtoWithoutIsActive);

      expect(result).toEqual(mockCustomerStaffIdentity);
      expect(
        mockPrismaService.customerStaffIdentity.create,
      ).toHaveBeenCalledWith({
        data: {
          customerStaffId: 'test-customer-staff-uuid-123',
          platform: 'slack',
          platformUserId: 'U1234567890',
          platformData: {
            displayName: 'John Doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          isActive: true,
        },
      });
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['platform', 'platformUserId'] },
      };
      mockPrismaService.customerStaffIdentity.create.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.create(createCustomerStaffIdentityDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(createCustomerStaffIdentityDto),
      ).rejects.toThrow('platform already exists');
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.customerStaffIdentity.create.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.create(createCustomerStaffIdentityDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.create(createCustomerStaffIdentityDto),
      ).rejects.toThrow('Database operation failed');
    });

    it('should re-throw non-Prisma errors', async () => {
      const error = new Error('Custom error');
      mockPrismaService.customerStaffIdentity.create.mockRejectedValue(error);

      await expect(
        service.create(createCustomerStaffIdentityDto),
      ).rejects.toThrow('Custom error');
    });
  });

  describe('update', () => {
    const updateCustomerStaffIdentityDto: UpdateCustomerStaffIdentityDto = {
      platform: 'discord',
      platformUserId: 'D1234567890',
      platformData: { displayName: 'John Doe Updated' },
      isActive: false,
    };

    const updatedCustomerStaffIdentity: CustomerStaffIdentity = {
      ...mockCustomerStaffIdentity,
      platform: 'discord',
      platformUserId: 'D1234567890',
      platformData: { displayName: 'John Doe Updated' },
      isActive: false,
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should update a customer staff identity and update cache', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.update.mockResolvedValue(
        updatedCustomerStaffIdentity,
      );

      const result = await service.update(
        whereInput,
        updateCustomerStaffIdentityDto,
      );

      expect(result).toEqual(updatedCustomerStaffIdentity);
      expect(
        mockPrismaService.customerStaffIdentity.findUnique,
      ).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(
        mockPrismaService.customerStaffIdentity.update,
      ).toHaveBeenCalledWith({
        where: whereInput,
        data: {
          customerStaffId: undefined,
          platform: 'discord',
          platformUserId: 'D1234567890',
          platformData: { displayName: 'John Doe Updated' },
          isActive: false,
        },
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:test-customer-staff-identity-uuid-123',
      );
      // Check new cache entry
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:test-customer-staff-identity-uuid-123',
        updatedCustomerStaffIdentity,
        3600,
      );
    });

    it('should throw NotFoundException when customer staff identity not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow('Customer staff identity not found');
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      const prismaError = {
        code: 'P2002',
        meta: { target: ['platform', 'platformUserId'] },
      };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.update.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow('platform already exists');
    });

    it('should throw NotFoundException on record not found during update', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.update.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow('Customer staff identity not found');
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.update.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(whereInput, updateCustomerStaffIdentityDto),
      ).rejects.toThrow('Database operation failed');
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should delete a customer staff identity successfully and invalidate cache', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.delete.mockResolvedValue(
        mockCustomerStaffIdentity,
      );

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockCustomerStaffIdentity);
      expect(
        mockPrismaService.customerStaffIdentity.findUnique,
      ).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(
        mockPrismaService.customerStaffIdentity.delete,
      ).toHaveBeenCalledWith({
        where: whereInput,
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'customer-staff-identities:findOne:id:test-customer-staff-identity-uuid-123',
      );
    });

    it('should throw NotFoundException when customer staff identity not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        null,
      );

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Customer staff identity not found',
      );
    });

    it('should throw NotFoundException on record not found during delete', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.delete.mockRejectedValue(
        prismaError,
      );

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Customer staff identity not found',
      );
    });

    it('should throw ConflictException on foreign key constraint violation', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      const prismaError = {
        code: 'P2003',
        meta: {},
      };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.delete.mockRejectedValue(
        prismaError,
      );

      await expect(service.delete(whereInput)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Cannot delete customer staff identity as it is being used by other entities',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-customer-staff-identity-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.customerStaffIdentity.findUnique.mockResolvedValue(
        mockCustomerStaffIdentity,
      );
      mockPrismaService.customerStaffIdentity.delete.mockRejectedValue(
        prismaError,
      );

      await expect(service.delete(whereInput)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });
});
