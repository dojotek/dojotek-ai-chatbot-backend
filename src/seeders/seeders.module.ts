import { Module } from '@nestjs/common';
import { SeedersService } from './seeders.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [],
  providers: [SeedersService],
})
export class SeedersModule {}
