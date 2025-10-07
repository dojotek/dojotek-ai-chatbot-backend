import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CustomerStaffIdentitiesController } from './customer-staff-identities.controller';
import { CustomerStaffIdentitiesService } from './customer-staff-identities.service';
import { CreateCustomerStaffIdentityDto } from './dto/create-customer-staff-identity.dto';
import { UpdateCustomerStaffIdentityDto } from './dto/update-customer-staff-identity.dto';
import { CustomerStaffIdentity } from './entities/customer-staff-identity.entity';

describe('CustomerStaffIdentitiesController', () => {
  let controller: CustomerStaffIdentitiesController;

  const mockCustomerStaffIdentity: CustomerStaffIdentity = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    customerStaffId: '01234567-89ab-cdef-0123-456789abcdef',
    platform: 'slack',
    platformUserId: 'U1234567890',
    platformData: {
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
    },
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockCreateCustomerStaffIdentityDto: CreateCustomerStaffIdentityDto = {
    customerStaffId: '01234567-89ab-cdef-0123-456789abcdef',
    platform: 'slack',
    platformUserId: 'U1234567890',
    platformData: {
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
    },
    isActive: true,
  };

  const mockUpdateCustomerStaffIdentityDto: UpdateCustomerStaffIdentityDto = {
    platform: 'discord',
    platformUserId: 'D1234567890',
    platformData: { displayName: 'John Doe Updated' },
  };

  const mockCustomerStaffIdentitiesService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerStaffIdentitiesController],
      providers: [
        {
          provide: CustomerStaffIdentitiesService,
          useValue: mockCustomerStaffIdentitiesService,
        },
      ],
    }).compile();

    controller = module.get<CustomerStaffIdentitiesController>(
      CustomerStaffIdentitiesController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer staff identity successfully', async () => {
      mockCustomerStaffIdentitiesService.create.mockResolvedValue(
        mockCustomerStaffIdentity,
      );

      const result = await controller.create(
        mockCreateCustomerStaffIdentityDto,
      );

      expect(mockCustomerStaffIdentitiesService.create).toHaveBeenCalledWith(
        mockCreateCustomerStaffIdentityDto,
      );
      expect(result).toEqual(mockCustomerStaffIdentity);
    });

    it('should handle ConflictException when customer staff identity field already exists', async () => {
      const conflictException = new ConflictException(
        'platform already exists',
      );
      mockCustomerStaffIdentitiesService.create.mockRejectedValue(
        conflictException,
      );

      await expect(
        controller.create(mockCreateCustomerStaffIdentityDto),
      ).rejects.toThrow(conflictException);
      expect(mockCustomerStaffIdentitiesService.create).toHaveBeenCalledWith(
        mockCreateCustomerStaffIdentityDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockCustomerStaffIdentitiesService.create.mockRejectedValue(
        internalServerError,
      );

      await expect(
        controller.create(mockCreateCustomerStaffIdentityDto),
      ).rejects.toThrow(internalServerError);
      expect(mockCustomerStaffIdentitiesService.create).toHaveBeenCalledWith(
        mockCreateCustomerStaffIdentityDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all customer staff identities successfully without search parameters', async () => {
      const mockCustomerStaffIdentities = [mockCustomerStaffIdentity];
      mockCustomerStaffIdentitiesService.findMany.mockResolvedValue(
        mockCustomerStaffIdentities,
      );

      const result = await controller.findAll();

      expect(mockCustomerStaffIdentitiesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffIdentities);
    });

    it('should return customer staff identities with pagination parameters', async () => {
      const mockCustomerStaffIdentities = [mockCustomerStaffIdentity];
      mockCustomerStaffIdentitiesService.findMany.mockResolvedValue(
        mockCustomerStaffIdentities,
      );

      const result = await controller.findAll(0, 5);

      expect(mockCustomerStaffIdentitiesService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffIdentities);
    });

    it('should return customer staff identities with customerStaffId filter', async () => {
      const mockCustomerStaffIdentities = [mockCustomerStaffIdentity];
      mockCustomerStaffIdentitiesService.findMany.mockResolvedValue(
        mockCustomerStaffIdentities,
      );

      const result = await controller.findAll(
        undefined,
        undefined,
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockCustomerStaffIdentitiesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          customerStaffId: '01234567-89ab-cdef-0123-456789abcdef',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffIdentities);
    });

    it('should return customer staff identities with platform filter', async () => {
      const mockCustomerStaffIdentities = [mockCustomerStaffIdentity];
      mockCustomerStaffIdentitiesService.findMany.mockResolvedValue(
        mockCustomerStaffIdentities,
      );

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        'slack',
      );

      expect(mockCustomerStaffIdentitiesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          platform: { contains: 'slack', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffIdentities);
    });

    it('should return customer staff identities with isActive filter', async () => {
      const mockCustomerStaffIdentities = [mockCustomerStaffIdentity];
      mockCustomerStaffIdentitiesService.findMany.mockResolvedValue(
        mockCustomerStaffIdentities,
      );

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        'true',
      );

      expect(mockCustomerStaffIdentitiesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffIdentities);
    });

    it('should return customer staff identities with combined filters', async () => {
      const mockCustomerStaffIdentities = [mockCustomerStaffIdentity];
      mockCustomerStaffIdentitiesService.findMany.mockResolvedValue(
        mockCustomerStaffIdentities,
      );

      const result = await controller.findAll(
        0,
        5,
        '01234567-89ab-cdef-0123-456789abcdef',
        'slack',
        'true',
      );

      expect(mockCustomerStaffIdentitiesService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: {
          customerStaffId: '01234567-89ab-cdef-0123-456789abcdef',
          platform: { contains: 'slack', mode: 'insensitive' },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffIdentities);
    });
  });

  describe('findOne', () => {
    it('should return a customer staff identity by id successfully', async () => {
      mockCustomerStaffIdentitiesService.findOne.mockResolvedValue(
        mockCustomerStaffIdentity,
      );

      const result = await controller.findOne(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockCustomerStaffIdentitiesService.findOne).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toEqual(mockCustomerStaffIdentity);
    });

    it('should return null when customer staff identity is not found', async () => {
      mockCustomerStaffIdentitiesService.findOne.mockResolvedValue(null);

      const result = await controller.findOne('non-existent-id');

      expect(mockCustomerStaffIdentitiesService.findOne).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a customer staff identity successfully', async () => {
      const updatedCustomerStaffIdentity = {
        ...mockCustomerStaffIdentity,
        platform: 'discord',
        platformUserId: 'D1234567890',
        platformData: { displayName: 'John Doe Updated' },
      };
      mockCustomerStaffIdentitiesService.update.mockResolvedValue(
        updatedCustomerStaffIdentity,
      );

      const result = await controller.update(
        '01234567-89ab-cdef-0123-456789abcdef',
        mockUpdateCustomerStaffIdentityDto,
      );

      expect(mockCustomerStaffIdentitiesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateCustomerStaffIdentityDto,
      );
      expect(result).toEqual(updatedCustomerStaffIdentity);
    });

    it('should handle NotFoundException when customer staff identity is not found', async () => {
      const notFoundException = new NotFoundException(
        'Customer staff identity not found',
      );
      mockCustomerStaffIdentitiesService.update.mockRejectedValue(
        notFoundException,
      );

      await expect(
        controller.update(
          'non-existent-id',
          mockUpdateCustomerStaffIdentityDto,
        ),
      ).rejects.toThrow(notFoundException);

      expect(mockCustomerStaffIdentitiesService.update).toHaveBeenCalledWith(
        { id: 'non-existent-id' },
        mockUpdateCustomerStaffIdentityDto,
      );
    });

    it('should handle ConflictException when customer staff identity field already exists', async () => {
      const conflictException = new ConflictException(
        'platform already exists',
      );
      mockCustomerStaffIdentitiesService.update.mockRejectedValue(
        conflictException,
      );

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateCustomerStaffIdentityDto,
        ),
      ).rejects.toThrow(conflictException);

      expect(mockCustomerStaffIdentitiesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateCustomerStaffIdentityDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockCustomerStaffIdentitiesService.update.mockRejectedValue(
        internalServerError,
      );

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateCustomerStaffIdentityDto,
        ),
      ).rejects.toThrow(internalServerError);

      expect(mockCustomerStaffIdentitiesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateCustomerStaffIdentityDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a customer staff identity successfully', async () => {
      mockCustomerStaffIdentitiesService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockCustomerStaffIdentitiesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toBeUndefined();
    });

    it('should handle NotFoundException when customer staff identity is not found', async () => {
      const notFoundException = new NotFoundException(
        'Customer staff identity not found',
      );
      mockCustomerStaffIdentitiesService.delete.mockRejectedValue(
        notFoundException,
      );

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        notFoundException,
      );
      expect(mockCustomerStaffIdentitiesService.delete).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
    });

    it('should handle ConflictException when customer staff identity is being used by other entities', async () => {
      const conflictException = new ConflictException(
        'Cannot delete customer staff identity as it is being used by other entities',
      );
      mockCustomerStaffIdentitiesService.delete.mockRejectedValue(
        conflictException,
      );

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(conflictException);

      expect(mockCustomerStaffIdentitiesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockCustomerStaffIdentitiesService.delete.mockRejectedValue(
        internalServerError,
      );

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(internalServerError);

      expect(mockCustomerStaffIdentitiesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });
  });
});
