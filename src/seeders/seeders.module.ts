import { Module } from '@nestjs/common';
import { SeedersService } from './seeders.service';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [UsersModule, RolesModule],
  controllers: [],
  providers: [SeedersService],
})
export class SeedersModule {}
