import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto, SignInResponseDto } from './dto/sign-in.dto';
import type { RequestWithUser } from '../interfaces/request.interface';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-in')
  @Public()
  @ApiOperation({
    summary: 'Sign in user',
    description: 'Authenticate user with email and password',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: SignInResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  async signIn(
    @Body(ValidationPipe) signInDto: SignInDto,
  ): Promise<SignInResponseDto> {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Get('who-am-i')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user information',
    description:
      'Returns the authenticated user information based on the JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information successfully retrieved',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
  })
  whoAmI(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Get('simulate-http-400')
  @Public()
  @ApiOperation({
    summary: 'Simulate HTTP 400 Bad Request',
    description: 'Test endpoint that always returns a 400 Bad Request error',
  })
  @ApiBadRequestResponse({
    description: 'Simulated bad request error',
  })
  simulateHttp400() {
    throw new BadRequestException('This is a simulated HTTP 400 Bad Request error');
  }

  @Get('simulate-http-500')
  @Public()
  @ApiOperation({
    summary: 'Simulate HTTP 500 Internal Server Error',
    description: 'Test endpoint that always returns a 500 Internal Server Error',
  })
  @ApiInternalServerErrorResponse({
    description: 'Simulated internal server error',
  })
  simulateHttp500() {
    throw new InternalServerErrorException('This is a simulated HTTP 500 Internal Server Error');
  }
}
