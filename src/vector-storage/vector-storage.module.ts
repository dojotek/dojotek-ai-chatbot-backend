import { Module } from '@nestjs/common';
import { ConfigsModule } from '../configs/configs.module';
import { VectorStorageFactoryService } from './vector-storage-factory.service';

@Module({
  imports: [ConfigsModule],
  controllers: [],
  providers: [VectorStorageFactoryService],
  exports: [VectorStorageFactoryService],
})
export class VectorStorageModule {}
