import { Test, TestingModule } from '@nestjs/testing';
import { CustomerStaffsService } from './customer-staffs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateCustomerStaffDto } from './dto/create-customer-staff.dto';
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
    createdAt: new Date(),
    updatedAt: new Date(),
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
    it('should return cached customer staff when found in cache', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockCustomerStaff);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockCustomerStaff);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'customer-staffs:findOne:id:test-uuid-123',
      );
      expect(mockPrismaService.customerStaff.findUnique).not.toHaveBeenCalled();
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
      mockCachesService.set.mockResolvedValue('OK');
      mockPrismaService.customerStaff.create.mockResolvedValue(
        mockCustomerStaff,
      );

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
    });
  });
});
