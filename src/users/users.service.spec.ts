import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 'test-uuid-123',
    email: 'test@example.com',
    password: 'hashedPassword123',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
    });

    it('should return null when user not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
    });
  });

  describe('findMany', () => {
    it('should return array of users with default parameters', async () => {
      const users = [mockUser];
      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findMany({});

      expect(result).toEqual(users);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return array of users with custom parameters', async () => {
      const users = [mockUser];
      const params = {
        skip: 0,
        take: 10,
        cursor: { id: 'test-uuid-123' },
        where: { email: 'test@example.com' },
        orderBy: { createdAt: 'desc' as const },
      };
      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findMany(params);

      expect(result).toEqual(users);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(params);
    });
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'plainPassword123',
      name: 'Test User',
    };

    beforeEach(() => {
      mockedBcrypt.hash.mockResolvedValue('hashedPassword123' as never);
    });

    it('should create a user with hashed password', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plainPassword123', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashedPassword123',
        },
      });
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'email already exists',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const error = new Error('Custom error');
      mockPrismaService.user.create.mockRejectedValue(error);

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Custom error',
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      email: 'updated@example.com',
      password: 'newPassword123',
      name: 'Updated User',
    };

    const updatedUser: User = {
      ...mockUser,
      email: 'updated@example.com',
      name: 'Updated User',
    };

    beforeEach(() => {
      mockedBcrypt.hash.mockResolvedValue('hashedNewPassword123' as never);
    });

    it('should update a user with hashed password', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(whereInput, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: whereInput,
        data: {
          email: 'updated@example.com',
          name: 'Updated User',
          password: 'hashedNewPassword123',
        },
      });
    });

    it('should update a user without password', async () => {
      const updateDtoWithoutPassword: UpdateUserDto = {
        email: 'updated@example.com',
        name: 'Updated User',
      };
      const whereInput = { id: 'test-uuid-123' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(whereInput, updateDtoWithoutPassword);

      expect(result).toEqual(updatedUser);
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: whereInput,
        data: {
          email: 'updated@example.com',
          name: 'Updated User',
        },
      });
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const whereInput = { id: 'test-uuid-123' };
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(service.update(whereInput, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(whereInput, updateUserDto)).rejects.toThrow(
        'email already exists',
      );
    });

    it('should throw ConflictException on record not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(service.update(whereInput, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(whereInput, updateUserDto)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(service.update(whereInput, updateUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.update(whereInput, updateUserDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('delete', () => {
    it('should delete a user successfully', async () => {
      const whereInput = { id: 'test-uuid-123' };
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: whereInput,
      });
    });

    it('should throw ConflictException on record not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.user.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.user.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validatePassword(
        'plainPassword',
        'hashedPassword',
      );

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'plainPassword',
        'hashedPassword',
      );
    });

    it('should return false for invalid password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validatePassword(
        'wrongPassword',
        'hashedPassword',
      );

      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'wrongPassword',
        'hashedPassword',
      );
    });
  });
});
