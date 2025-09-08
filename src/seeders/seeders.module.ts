import { Module } from '@nestjs/common';
import { SeedersService } from './seeders.service';

@Module({
  controllers: [],
  providers: [SeedersService],
})
export class SeedersModule {}
