import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomerStaffsController } from './customer-staffs.controller';
import { CustomerStaffsService } from './customer-staffs.service';
import { CreateCustomerStaffDto } from './dto/create-customer-staff.dto';
import { UpdateCustomerStaffDto } from './dto/update-customer-staff.dto';

describe('CustomerStaffsController', () => {
  let controller: CustomerStaffsController;

  const mockCustomerStaff = {
    id: '1',
    customerId: 'customer-1',
    name: 'Test Staff',
    email: 'test@company.com',
    phone: '+628123456789',
    department: 'IT',
    position: 'Software Engineer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateCustomerStaffDto: CreateCustomerStaffDto = {
    customerId: 'customer-1',
    name: 'Test Staff',
    email: 'test@company.com',
    phone: '+628123456789',
    department: 'IT',
    position: 'Software Engineer',
  };

  const mockUpdateCustomerStaffDto: UpdateCustomerStaffDto = {
    name: 'Updated Staff',
    department: 'Engineering',
  };

  const mockCustomerStaffsService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerStaffsController],
      providers: [
        {
          provide: CustomerStaffsService,
          useValue: mockCustomerStaffsService,
        },
      ],
    }).compile();

    controller = module.get<CustomerStaffsController>(CustomerStaffsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer staff successfully', async () => {
      mockCustomerStaffsService.create.mockResolvedValue(mockCustomerStaff);

      const result = await controller.create(mockCreateCustomerStaffDto);

      expect(mockCustomerStaffsService.create).toHaveBeenCalledWith(
        mockCreateCustomerStaffDto,
      );
      expect(result).toEqual(mockCustomerStaff);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Customer not found',
        HttpStatus.CONFLICT,
      );
      mockCustomerStaffsService.create.mockRejectedValue(httpException);

      await expect(
        controller.create(mockCreateCustomerStaffDto),
      ).rejects.toThrow(httpException);
      expect(mockCustomerStaffsService.create).toHaveBeenCalledWith(
        mockCreateCustomerStaffDto,
      );
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockCustomerStaffsService.create.mockRejectedValue(unexpectedError);

      await expect(
        controller.create(mockCreateCustomerStaffDto),
      ).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while creating customer staff',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockCustomerStaffsService.create).toHaveBeenCalledWith(
        mockCreateCustomerStaffDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all customer staffs successfully', async () => {
      const mockCustomerStaffs = [mockCustomerStaff];
      mockCustomerStaffsService.findMany.mockResolvedValue(mockCustomerStaffs);

      const result = await controller.findAll();

      expect(mockCustomerStaffsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffs);
    });

    it('should return customer staffs with query parameters', async () => {
      const mockCustomerStaffs = [mockCustomerStaff];
      mockCustomerStaffsService.findMany.mockResolvedValue(mockCustomerStaffs);

      const result = await controller.findAll(5, 20, 'test', 'customer-1');

      expect(mockCustomerStaffsService.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 20,
        where: {
          AND: [
            { customerId: 'customer-1' },
            {
              OR: [
                { name: { contains: 'test', mode: 'insensitive' } },
                { email: { contains: 'test', mode: 'insensitive' } },
                { department: { contains: 'test', mode: 'insensitive' } },
                { position: { contains: 'test', mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomerStaffs);
    });

    it('should throw HttpException when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockCustomerStaffsService.findMany.mockRejectedValue(unexpectedError);

      await expect(controller.findAll()).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching customer staffs',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return a customer staff successfully', async () => {
      mockCustomerStaffsService.findOne.mockResolvedValue(mockCustomerStaff);

      const result = await controller.findOne('1');

      expect(mockCustomerStaffsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
      expect(result).toEqual(mockCustomerStaff);
    });

    it('should throw HttpException with NOT_FOUND when customer staff is not found', async () => {
      mockCustomerStaffsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException('Customer staff not found', HttpStatus.NOT_FOUND),
      );
      expect(mockCustomerStaffsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockCustomerStaffsService.findOne.mockRejectedValue(unexpectedError);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching customer staff',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockCustomerStaffsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
    });
  });

  // Note: findByEmail test removed as email is not unique in CustomerStaff schema

  describe('update', () => {
    it('should update a customer staff successfully', async () => {
      const updatedCustomerStaff = {
        ...mockCustomerStaff,
        name: 'Updated Staff',
      };
      mockCustomerStaffsService.update.mockResolvedValue(updatedCustomerStaff);

      const result = await controller.update('1', mockUpdateCustomerStaffDto);

      expect(mockCustomerStaffsService.update).toHaveBeenCalledWith(
        { id: '1' },
        mockUpdateCustomerStaffDto,
      );
      expect(result).toEqual(updatedCustomerStaff);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Customer staff not found',
        HttpStatus.CONFLICT,
      );
      mockCustomerStaffsService.update.mockRejectedValue(httpException);

      await expect(
        controller.update('1', mockUpdateCustomerStaffDto),
      ).rejects.toThrow(httpException);
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockCustomerStaffsService.update.mockRejectedValue(unexpectedError);

      await expect(
        controller.update('1', mockUpdateCustomerStaffDto),
      ).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while updating customer staff',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete a customer staff successfully', async () => {
      mockCustomerStaffsService.delete.mockResolvedValue(mockCustomerStaff);

      const result = await controller.remove('1');

      expect(mockCustomerStaffsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
      expect(result).toBeUndefined();
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Customer staff not found',
        HttpStatus.CONFLICT,
      );
      mockCustomerStaffsService.delete.mockRejectedValue(httpException);

      await expect(controller.remove('1')).rejects.toThrow(httpException);
      expect(mockCustomerStaffsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockCustomerStaffsService.delete.mockRejectedValue(unexpectedError);

      await expect(controller.remove('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while deleting customer staff',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockCustomerStaffsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
    });
  });
});
