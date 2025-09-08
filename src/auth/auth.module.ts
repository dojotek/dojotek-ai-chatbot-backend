import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { LogsModule } from '../logs/logs.module';
import { UsersModule } from '../users/users.module';
import { ConfigsModule } from '../configs/configs.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigsService } from '../configs/configs.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
