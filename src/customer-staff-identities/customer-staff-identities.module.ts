import { Module } from '@nestjs/common';
import { CustomerStaffIdentitiesService } from './customer-staff-identities.service';
import { CustomerStaffIdentitiesController } from './customer-staff-identities.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [PrismaModule, CachesModule, ConfigsModule],
  controllers: [CustomerStaffIdentitiesController],
  providers: [CustomerStaffIdentitiesService],
  exports: [CustomerStaffIdentitiesService],
})
export class CustomerStaffIdentitiesModule {}
