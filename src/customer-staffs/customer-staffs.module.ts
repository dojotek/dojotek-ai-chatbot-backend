import { Module } from '@nestjs/common';
import { CustomerStaffsService } from './customer-staffs.service';
import { CustomerStaffsController } from './customer-staffs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [PrismaModule, CachesModule, ConfigsModule],
  controllers: [CustomerStaffsController],
  providers: [CustomerStaffsService],
  exports: [CustomerStaffsService],
})
export class CustomerStaffsModule {}
