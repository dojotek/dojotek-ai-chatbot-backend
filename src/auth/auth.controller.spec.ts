import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignInDto, SignInResponseDto } from './dto/sign-in.dto';
import type {
  RequestWithUser,
  UserWithoutPassword,
} from '../interfaces/request.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock AuthService
  const mockAuthService = {
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    const mockSignInDto: SignInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockSignInResponse: SignInResponseDto = {
      access_token: 'mock-jwt-token',
      token_type: 'Bearer',
      expires_in: '3600s',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    it('should successfully sign in with valid credentials', async () => {
      // Arrange
      const signInSpy = jest
        .spyOn(authService, 'signIn')
        .mockResolvedValue(mockSignInResponse);

      // Act
      const result = await controller.signIn(mockSignInDto);

      // Assert
      expect(result).toEqual(mockSignInResponse);
      expect(signInSpy).toHaveBeenCalledTimes(1);
      expect(signInSpy).toHaveBeenCalledWith(
        mockSignInDto.email,
        mockSignInDto.password,
      );
    });

    it('should throw UnauthorizedException when service throws UnauthorizedException', async () => {
      // Arrange
      const signInSpy = jest
        .spyOn(authService, 'signIn')
        .mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      // Act & Assert
      await expect(controller.signIn(mockSignInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(signInSpy).toHaveBeenCalledTimes(1);
      expect(signInSpy).toHaveBeenCalledWith(
        mockSignInDto.email,
        mockSignInDto.password,
      );
    });

    it('should throw error when service throws unexpected error', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      const signInSpy = jest
        .spyOn(authService, 'signIn')
        .mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(controller.signIn(mockSignInDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(signInSpy).toHaveBeenCalledTimes(1);
      expect(signInSpy).toHaveBeenCalledWith(
        mockSignInDto.email,
        mockSignInDto.password,
      );
    });

    it('should call authService.signIn with correct parameters', async () => {
      // Arrange
      const signInSpy = jest
        .spyOn(authService, 'signIn')
        .mockResolvedValue(mockSignInResponse);
      const customSignInDto: SignInDto = {
        email: 'different@example.com',
        password: 'differentPassword',
      };

      // Act
      await controller.signIn(customSignInDto);

      // Assert
      expect(signInSpy).toHaveBeenCalledWith(
        customSignInDto.email,
        customSignInDto.password,
      );
    });

    it('should return the exact response from authService', async () => {
      // Arrange
      const customResponse: SignInResponseDto = {
        access_token: 'different-token',
        token_type: 'Bearer',
        expires_in: '7200s',
        user: {
          id: 'different-id',
          email: 'different@example.com',
          name: 'Different User',
        },
      };
      const signInSpy = jest
        .spyOn(authService, 'signIn')
        .mockResolvedValue(customResponse);

      // Act
      const result = await controller.signIn(mockSignInDto);

      // Assert
      expect(result).toBe(customResponse);
      expect(result).toEqual(customResponse);
      expect(signInSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle user with null name', async () => {
      // Arrange
      const responseWithNullName: SignInResponseDto = {
        access_token: 'token-with-null-name',
        token_type: 'Bearer',
        expires_in: '3600s',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          name: null,
        },
      };
      const signInSpy = jest
        .spyOn(authService, 'signIn')
        .mockResolvedValue(responseWithNullName);

      // Act
      const result = await controller.signIn(mockSignInDto);

      // Assert
      expect(result).toEqual(responseWithNullName);
      expect(result.user.name).toBeNull();
      expect(signInSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('whoAmI', () => {
    const mockUser: UserWithoutPassword = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    };

    const mockRequest: RequestWithUser = {
      user: mockUser,
    } as RequestWithUser;

    it('should return the user from the request object', () => {
      // Act
      const result = controller.whoAmI(mockRequest);

      // Assert
      expect(result).toBe(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should return user with all required fields', () => {
      // Act
      const result = controller.whoAmI(mockRequest);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('password');
    });

    it('should handle user with null name', () => {
      // Arrange
      const userWithNullName: UserWithoutPassword = {
        ...mockUser,
        name: null,
      };
      const requestWithNullName: RequestWithUser = {
        user: userWithNullName,
      } as RequestWithUser;

      // Act
      const result = controller.whoAmI(requestWithNullName);

      // Assert
      expect(result).toEqual(userWithNullName);
      expect(result.name).toBeNull();
    });

    it('should return the exact user object without modification', () => {
      // Arrange
      const differentUser: UserWithoutPassword = {
        id: 'different-user-id',
        email: 'different@example.com',
        name: 'Different User',
        createdAt: new Date('2023-06-01T00:00:00.000Z'),
        updatedAt: new Date('2023-06-15T00:00:00.000Z'),
      };
      const differentRequest: RequestWithUser = {
        user: differentUser,
      } as RequestWithUser;

      // Act
      const result = controller.whoAmI(differentRequest);

      // Assert
      expect(result).toBe(differentUser);
      expect(result).toEqual(differentUser);
    });
  });
});
