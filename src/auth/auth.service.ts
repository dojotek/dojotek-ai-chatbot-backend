import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignInResponseDto } from './dto/sign-in.dto';
import { ConfigsService } from '../configs/configs.service';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly logsService: LogsService,
    private configsService: ConfigsService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, passwordInput: string): Promise<any> {
    const user = await this.usersService.findOne({ email });
    if (user?.password !== passwordInput) {
      throw new UnauthorizedException();
    }
    const { password, ...result } = user; // eslint-disable-line @typescript-eslint/no-unused-vars
    return result;
  }

  async signIn(email: string, password: string): Promise<SignInResponseDto> {
    this.logsService.logSafe(
      'starting sign-in process',
      { email },
      'AuthService',
    );

    // Find user by email
    const user = await this.usersService.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password using bcrypt
    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    // Generate access token
    const accessToken = await this.jwtService.signAsync(payload);

    // Return response according to SignInResponseDto
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.configsService.jwtExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
