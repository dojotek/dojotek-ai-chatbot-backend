import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateUserDto: CreateUserDto = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockUpdateUserDto: UpdateUserDto = {
    name: 'Updated User',
  };

  const mockUsersService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(mockCreateUserDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(mockCreateUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Email already exists',
        HttpStatus.CONFLICT,
      );
      mockUsersService.create.mockRejectedValue(httpException);

      await expect(controller.create(mockCreateUserDto)).rejects.toThrow(
        httpException,
      );
      expect(mockUsersService.create).toHaveBeenCalledWith(mockCreateUserDto);
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockUsersService.create.mockRejectedValue(unexpectedError);

      await expect(controller.create(mockCreateUserDto)).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while creating user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockUsersService.create).toHaveBeenCalledWith(mockCreateUserDto);
    });
  });

  describe('findAll', () => {
    it('should return all users successfully', async () => {
      const mockUsers = [mockUser];
      mockUsersService.findMany.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(mockUsersService.findMany).toHaveBeenCalledWith({});
      expect(result).toEqual(mockUsers);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockUsersService.findMany.mockRejectedValue(httpException);

      await expect(controller.findAll()).rejects.toThrow(httpException);
      expect(mockUsersService.findMany).toHaveBeenCalledWith({});
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockUsersService.findMany.mockRejectedValue(unexpectedError);

      await expect(controller.findAll()).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching users',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockUsersService.findMany).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a user successfully', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(mockUsersService.findOne).toHaveBeenCalledWith({ id: '1' });
      expect(result).toEqual(mockUser);
    });

    it('should throw HttpException with NOT_FOUND when user is not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockUsersService.findOne.mockRejectedValue(httpException);

      await expect(controller.findOne('1')).rejects.toThrow(httpException);
      expect(mockUsersService.findOne).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockUsersService.findOne.mockRejectedValue(unexpectedError);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith({ id: '1' });
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, name: 'Updated User' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('1', mockUpdateUserDto);

      expect(mockUsersService.update).toHaveBeenCalledWith(
        { id: '1' },
        mockUpdateUserDto,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Email already exists',
        HttpStatus.CONFLICT,
      );
      mockUsersService.update.mockRejectedValue(httpException);

      await expect(controller.update('1', mockUpdateUserDto)).rejects.toThrow(
        httpException,
      );
      expect(mockUsersService.update).toHaveBeenCalledWith(
        { id: '1' },
        mockUpdateUserDto,
      );
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockUsersService.update.mockRejectedValue(unexpectedError);

      await expect(controller.update('1', mockUpdateUserDto)).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while updating user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockUsersService.update).toHaveBeenCalledWith(
        { id: '1' },
        mockUpdateUserDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      mockUsersService.delete.mockResolvedValue(mockUser);

      const result = await controller.remove('1');

      expect(mockUsersService.delete).toHaveBeenCalledWith({ id: '1' });
      expect(result).toEqual(mockUser);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'User not found',
        HttpStatus.CONFLICT,
      );
      mockUsersService.delete.mockRejectedValue(httpException);

      await expect(controller.remove('1')).rejects.toThrow(httpException);
      expect(mockUsersService.delete).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockUsersService.delete.mockRejectedValue(unexpectedError);

      await expect(controller.remove('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while deleting user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockUsersService.delete).toHaveBeenCalledWith({ id: '1' });
    });
  });
});
