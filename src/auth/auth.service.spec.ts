import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SignInResponseDto } from './dto/sign-in.dto';
import { LogsService } from '../logs/logs.service';
import { ConfigsService } from '../configs/configs.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  // Mock user data
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword123',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock services
  const mockUsersService = {
    findOne: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockLogsService = {
    logSafe: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigsService = {
    jwtExpiresIn: '86400s',
    jwtSecret: 'test-secret',
    port: 3000,
    nodeEnv: 'test',
    logLevel: 'info',
    getConfigWithDefault: jest.fn(),
    getRequiredConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const mockAccessToken = 'mock-jwt-token';

    it('should successfully sign in with valid credentials', async () => {
      // Arrange
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(mockUser);
      const validatePasswordSpy = jest
        .spyOn(usersService, 'validatePassword')
        .mockResolvedValue(true);
      const signAsyncSpy = jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValue(mockAccessToken);

      const expectedPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      };

      const expectedResponse: SignInResponseDto = {
        access_token: mockAccessToken,
        token_type: 'Bearer',
        expires_in: mockConfigsService.jwtExpiresIn,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
      };

      // Act
      const result = await service.signIn(email, password);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ email });
      expect(validatePasswordSpy).toHaveBeenCalledTimes(1);
      expect(validatePasswordSpy).toHaveBeenCalledWith(
        password,
        mockUser.password,
      );
      expect(signAsyncSpy).toHaveBeenCalledTimes(1);
      expect(signAsyncSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(null);
      const validatePasswordSpy = jest.spyOn(usersService, 'validatePassword');
      const signAsyncSpy = jest.spyOn(jwtService, 'signAsync');

      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ email });
      expect(validatePasswordSpy).not.toHaveBeenCalled();
      expect(signAsyncSpy).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(mockUser);
      const validatePasswordSpy = jest
        .spyOn(usersService, 'validatePassword')
        .mockResolvedValue(false);
      const signAsyncSpy = jest.spyOn(jwtService, 'signAsync');

      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ email });
      expect(validatePasswordSpy).toHaveBeenCalledTimes(1);
      expect(validatePasswordSpy).toHaveBeenCalledWith(
        password,
        mockUser.password,
      );
      expect(signAsyncSpy).not.toHaveBeenCalled();
    });

    it('should handle user with null name', async () => {
      // Arrange
      const userWithNullName = { ...mockUser, name: null };
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(userWithNullName);
      const validatePasswordSpy = jest
        .spyOn(usersService, 'validatePassword')
        .mockResolvedValue(true);
      const signAsyncSpy = jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValue(mockAccessToken);

      const expectedPayload = {
        sub: userWithNullName.id,
        email: userWithNullName.email,
        name: userWithNullName.name,
      };

      const expectedResponse: SignInResponseDto = {
        access_token: mockAccessToken,
        token_type: 'Bearer',
        expires_in: mockConfigsService.jwtExpiresIn,
        user: {
          id: userWithNullName.id,
          email: userWithNullName.email,
          name: userWithNullName.name,
        },
      };

      // Act
      const result = await service.signIn(email, password);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.user.name).toBeNull();
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ email });
      expect(validatePasswordSpy).toHaveBeenCalledTimes(1);
      expect(validatePasswordSpy).toHaveBeenCalledWith(
        password,
        userWithNullName.password,
      );
      expect(signAsyncSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('should call all dependencies with correct parameters', async () => {
      // Arrange
      const differentEmail = 'different@example.com';
      const differentPassword = 'differentPassword';
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(mockUser);
      const validatePasswordSpy = jest
        .spyOn(usersService, 'validatePassword')
        .mockResolvedValue(true);
      const signAsyncSpy = jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValue(mockAccessToken);

      const expectedPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      };

      // Act
      await service.signIn(differentEmail, differentPassword);

      // Assert
      expect(findOneSpy).toHaveBeenCalledWith({ email: differentEmail });
      expect(validatePasswordSpy).toHaveBeenCalledWith(
        differentPassword,
        mockUser.password,
      );
      expect(signAsyncSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('should propagate errors from usersService.findOne', async () => {
      // Arrange
      const databaseError = new Error('Database connection failed');
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockRejectedValue(databaseError);
      const validatePasswordSpy = jest.spyOn(usersService, 'validatePassword');
      const signAsyncSpy = jest.spyOn(jwtService, 'signAsync');

      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow(
        'Database connection failed',
      );
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(validatePasswordSpy).not.toHaveBeenCalled();
      expect(signAsyncSpy).not.toHaveBeenCalled();
    });

    it('should propagate errors from usersService.validatePassword', async () => {
      // Arrange
      const validationError = new Error('Password validation failed');
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(mockUser);
      const validatePasswordSpy = jest
        .spyOn(usersService, 'validatePassword')
        .mockRejectedValue(validationError);
      const signAsyncSpy = jest.spyOn(jwtService, 'signAsync');

      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow(
        'Password validation failed',
      );
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(validatePasswordSpy).toHaveBeenCalledTimes(1);
      expect(signAsyncSpy).not.toHaveBeenCalled();
    });

    it('should propagate errors from jwtService.signAsync', async () => {
      // Arrange
      const jwtError = new Error('JWT signing failed');
      const findOneSpy = jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(mockUser);
      const validatePasswordSpy = jest
        .spyOn(usersService, 'validatePassword')
        .mockResolvedValue(true);
      const signAsyncSpy = jest
        .spyOn(jwtService, 'signAsync')
        .mockRejectedValue(jwtError);

      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow(
        'JWT signing failed',
      );
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(validatePasswordSpy).toHaveBeenCalledTimes(1);
      expect(signAsyncSpy).toHaveBeenCalledTimes(1);
    });
  });
});
