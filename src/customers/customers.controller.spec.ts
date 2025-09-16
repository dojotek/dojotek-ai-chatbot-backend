import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

describe('CustomersController', () => {
  let controller: CustomersController;

  const mockCustomer: Customer = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    name: 'PT. Teknologi Maju',
    email: 'contact@teknologimaju.com',
    phone: '+628123456789',
    address: 'Jl. Sudirman No. 123, Jakarta',
    industry: 'Technology',
    description: 'Leading technology company providing innovative solutions',
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockCreateCustomerDto: CreateCustomerDto = {
    name: 'PT. Teknologi Maju',
    email: 'contact@teknologimaju.com',
    phone: '+628123456789',
    address: 'Jl. Sudirman No. 123, Jakarta',
    industry: 'Technology',
    description: 'Leading technology company providing innovative solutions',
    isActive: true,
  };

  const mockUpdateCustomerDto: UpdateCustomerDto = {
    description: 'Updated leading technology company description',
  };

  const mockCustomersService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer successfully', async () => {
      mockCustomersService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create(mockCreateCustomerDto);

      expect(mockCustomersService.create).toHaveBeenCalledWith(
        mockCreateCustomerDto,
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should handle ConflictException when customer field already exists', async () => {
      const conflictException = new ConflictException('email already exists');
      mockCustomersService.create.mockRejectedValue(conflictException);

      await expect(controller.create(mockCreateCustomerDto)).rejects.toThrow(
        conflictException,
      );
      expect(mockCustomersService.create).toHaveBeenCalledWith(
        mockCreateCustomerDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockCustomersService.create.mockRejectedValue(internalServerError);

      await expect(controller.create(mockCreateCustomerDto)).rejects.toThrow(
        internalServerError,
      );
      expect(mockCustomersService.create).toHaveBeenCalledWith(
        mockCreateCustomerDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all customers successfully without search parameters', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomersService.findMany.mockResolvedValue(mockCustomers);

      const result = await controller.findAll();

      expect(mockCustomersService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomers);
    });

    it('should return customers with pagination parameters', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomersService.findMany.mockResolvedValue(mockCustomers);

      const result = await controller.findAll(0, 5);

      expect(mockCustomersService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomers);
    });

    it('should return customers with search parameter', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomersService.findMany.mockResolvedValue(mockCustomers);

      const result = await controller.findAll(
        undefined,
        undefined,
        'Teknologi',
      );

      expect(mockCustomersService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          OR: [
            { name: { contains: 'Teknologi', mode: 'insensitive' } },
            { email: { contains: 'Teknologi', mode: 'insensitive' } },
            { description: { contains: 'Teknologi', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomers);
    });

    it('should return customers with industry filter', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomersService.findMany.mockResolvedValue(mockCustomers);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        'Technology',
      );

      expect(mockCustomersService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          industry: { contains: 'Technology', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomers);
    });

    it('should return customers with isActive filter', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomersService.findMany.mockResolvedValue(mockCustomers);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        'true',
      );

      expect(mockCustomersService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomers);
    });

    it('should return customers with combined filters', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomersService.findMany.mockResolvedValue(mockCustomers);

      const result = await controller.findAll(
        0,
        5,
        'Teknologi',
        'Technology',
        'true',
      );

      expect(mockCustomersService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: {
          OR: [
            { name: { contains: 'Teknologi', mode: 'insensitive' } },
            { email: { contains: 'Teknologi', mode: 'insensitive' } },
            { description: { contains: 'Teknologi', mode: 'insensitive' } },
          ],
          industry: { contains: 'Technology', mode: 'insensitive' },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomers);
    });
  });

  describe('findOne', () => {
    it('should return a customer by id successfully', async () => {
      mockCustomersService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockCustomersService.findOne).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should return null when customer is not found', async () => {
      mockCustomersService.findOne.mockResolvedValue(null);

      const result = await controller.findOne('non-existent-id');

      expect(mockCustomersService.findOne).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a customer successfully', async () => {
      const updatedCustomer = {
        ...mockCustomer,
        description: 'Updated leading technology company description',
      };
      mockCustomersService.update.mockResolvedValue(updatedCustomer);

      const result = await controller.update(
        '01234567-89ab-cdef-0123-456789abcdef',
        mockUpdateCustomerDto,
      );

      expect(mockCustomersService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateCustomerDto,
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should handle NotFoundException when customer is not found', async () => {
      const notFoundException = new NotFoundException('Customer not found');
      mockCustomersService.update.mockRejectedValue(notFoundException);

      await expect(
        controller.update('non-existent-id', mockUpdateCustomerDto),
      ).rejects.toThrow(notFoundException);

      expect(mockCustomersService.update).toHaveBeenCalledWith(
        { id: 'non-existent-id' },
        mockUpdateCustomerDto,
      );
    });

    it('should handle ConflictException when customer field already exists', async () => {
      const conflictException = new ConflictException('email already exists');
      mockCustomersService.update.mockRejectedValue(conflictException);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateCustomerDto,
        ),
      ).rejects.toThrow(conflictException);

      expect(mockCustomersService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateCustomerDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockCustomersService.update.mockRejectedValue(internalServerError);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateCustomerDto,
        ),
      ).rejects.toThrow(internalServerError);

      expect(mockCustomersService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateCustomerDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a customer successfully', async () => {
      mockCustomersService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockCustomersService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toBeUndefined();
    });

    it('should handle NotFoundException when customer is not found', async () => {
      const notFoundException = new NotFoundException('Customer not found');
      mockCustomersService.delete.mockRejectedValue(notFoundException);

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        notFoundException,
      );
      expect(mockCustomersService.delete).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
    });

    it('should handle ConflictException when customer is being used by other entities', async () => {
      const conflictException = new ConflictException(
        'Cannot delete customer as it is being used by other entities',
      );
      mockCustomersService.delete.mockRejectedValue(conflictException);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(conflictException);

      expect(mockCustomersService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockCustomersService.delete.mockRejectedValue(internalServerError);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(internalServerError);

      expect(mockCustomersService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });
  });
});
