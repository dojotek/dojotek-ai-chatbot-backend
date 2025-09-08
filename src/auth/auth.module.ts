import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigsModule } from '../configs/configs.module';
import { ConfigsService } from '../configs/configs.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LogsModule } from 'src/logs/logs.module';

@Module({
  imports: [
    LogsModule,
    UsersModule,
    PassportModule,
    ConfigsModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigsModule],
      useFactory: (configsService: ConfigsService) => ({
        secret: configsService.jwtSecret,
        signOptions: { expiresIn: configsService.jwtExpiresIn },
      }),
      inject: [ConfigsService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
