import { Test, TestingModule } from '@nestjs/testing';
import { SeedersService } from './seeders.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ConflictException } from '@nestjs/common';
import type { CreateUserDto } from '../users/dto/create-user.dto';

// Mock faker
const mockFirstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
const mockLastNames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson'];
let firstNameIndex = 0;
let lastNameIndex = 0;

jest.mock('@faker-js/faker', () => ({
  faker: {
    person: {
      firstName: jest.fn(() => {
        const name = mockFirstNames[firstNameIndex % mockFirstNames.length];
        firstNameIndex++;
        return name;
      }),
      lastName: jest.fn(() => {
        const name = mockLastNames[lastNameIndex % mockLastNames.length];
        lastNameIndex++;
        return name;
      }),
    },
  },
}));

describe('SeedersService', () => {
  let service: SeedersService;
  let usersService: jest.Mocked<UsersService>;
  let createUserSpy: jest.SpyInstance;

  const mockUser = {
    id: '1',
    name: 'John Doe (Director)',
    email: 'john.doe@dojotek.net',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Reset faker mock indices
    firstNameIndex = 0;
    lastNameIndex = 0;

    const mockUsersService = {
      create: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedersService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SeedersService>(SeedersService);
    usersService = module.get(UsersService);
    createUserSpy = jest.spyOn(usersService, 'create');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedUsers', () => {
    it('should successfully create users for all roles', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      createUserSpy.mockResolvedValue(mockUser);

      // Act
      await service.seedUsers();

      // Assert
      expect(createUserSpy).toHaveBeenCalledTimes(5); // 5 roles
      expect(consoleSpy).toHaveBeenCalledWith('🌱 Starting user seeding...');
      expect(consoleSpy).toHaveBeenCalledWith('📝 Creating 5 users...');
      expect(consoleSpy).toHaveBeenCalledWith('🎉 User seeding completed!');

      // Verify user creation calls with correct data structure
      const expectedRoles = [
        'Director',
        'Head',
        'Manager',
        'Lead',
        'Operational',
      ];
      expectedRoles.forEach((role, index) => {
        const call = createUserSpy.mock.calls[index] as [CreateUserDto];
        expect(call).toBeDefined();
        expect(call[0]).toMatchObject({
          name: expect.stringContaining(`(${role})`) as string,
          email: expect.stringMatching(
            /^[a-z]+\.[a-z]+@dojotek\.net$/,
          ) as string,
          password: 'dojotek888999',
        });
      });

      consoleSpy.mockRestore();
    });

    it('should handle user already exists error gracefully', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const conflictError = new ConflictException('email already exists');
      createUserSpy
        .mockResolvedValueOnce(mockUser) // First user succeeds
        .mockRejectedValueOnce(conflictError) // Second user fails with conflict
        .mockResolvedValue(mockUser); // Rest succeed

      // Act
      await service.seedUsers();

      // Assert
      expect(createUserSpy).toHaveBeenCalledTimes(5);
      const consoleCalls = consoleSpy.mock.calls;
      expect(
        consoleCalls.some(
          (call) =>
            call[0] &&
            typeof call[0] === 'string' &&
            call[0].includes('⚠️  User already exists:'),
        ),
      ).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle other errors and log them', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const genericError = new Error('Database connection failed');
      createUserSpy
        .mockResolvedValueOnce(mockUser) // First user succeeds
        .mockRejectedValueOnce(genericError) // Second user fails with generic error
        .mockResolvedValue(mockUser); // Rest succeed

      // Act
      await service.seedUsers();

      // Assert
      expect(createUserSpy).toHaveBeenCalledTimes(5);
      const errorCalls = consoleErrorSpy.mock.calls;
      expect(
        errorCalls.some(
          (call) =>
            call[0] &&
            typeof call[0] === 'string' &&
            call[0].includes('❌ Failed to create user') &&
            call[1] === 'Database connection failed',
        ),
      ).toBe(true);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle errors without message property', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const errorWithoutMessage = { code: 'UNKNOWN_ERROR' };
      createUserSpy
        .mockResolvedValueOnce(mockUser) // First user succeeds
        .mockRejectedValueOnce(errorWithoutMessage) // Second user fails with error without message
        .mockResolvedValue(mockUser); // Rest succeed

      // Act
      await service.seedUsers();

      // Assert
      expect(createUserSpy).toHaveBeenCalledTimes(5);
      const errorCalls = consoleErrorSpy.mock.calls;
      expect(
        errorCalls.some(
          (call) =>
            call[0] &&
            typeof call[0] === 'string' &&
            call[0].includes('❌ Failed to create user') &&
            call[1] === 'Unknown error',
        ),
      ).toBe(true);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should generate unique user data for each role', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      createUserSpy.mockResolvedValue(mockUser);

      // Act
      await service.seedUsers();

      // Assert
      const createCalls = createUserSpy.mock.calls as [CreateUserDto][];
      const emails = createCalls.map((call) => call[0].email);
      const names = createCalls.map((call) => call[0].name);

      // Check that all emails are unique
      expect(new Set(emails).size).toBe(emails.length);

      // Check that all names are unique
      expect(new Set(names).size).toBe(names.length);

      // Check that all emails follow the correct pattern
      emails.forEach((email) => {
        expect(email).toMatch(/^[a-z]+\.[a-z]+@dojotek\.net$/);
      });

      // Check that all names contain the correct role
      const expectedRoles = [
        'Director',
        'Head',
        'Manager',
        'Lead',
        'Operational',
      ];
      names.forEach((name: string) => {
        expect(name).toBeDefined();
        const hasRole = expectedRoles.some((role) =>
          name.includes(`(${role})`),
        );
        expect(hasRole).toBe(true);
      });

      consoleSpy.mockRestore();
    });

    it('should use correct password for all users', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      createUserSpy.mockResolvedValue(mockUser);

      // Act
      await service.seedUsers();

      // Assert
      const createCalls = createUserSpy.mock.calls as [CreateUserDto][];
      createCalls.forEach((call) => {
        expect(call[0].password).toBe('dojotek888999');
      });

      consoleSpy.mockRestore();
    });
  });
});
