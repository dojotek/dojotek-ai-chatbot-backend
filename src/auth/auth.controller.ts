import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto, SignInResponseDto } from './dto/sign-in.dto';
import type { RequestWithUser } from '../interfaces/request.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // @UseGuards(AuthGuard('local'))
  @Post('sign-in')
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
  @UseGuards(JwtAuthGuard)
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
}
