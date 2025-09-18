import { Module } from '@nestjs/common';
import { ConfigsModule } from '../configs/configs.module';
import { ConfigsService } from '../configs/configs.service';
import { STORAGE_SERVICE } from './constants';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';

@Module({
  imports: [ConfigsModule],
  controllers: [],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (configsService: ConfigsService) => {
        if (configsService.storageProvider === 's3') {
          return new S3StorageAdapter(configsService);
        }
        throw new Error(
          `Unsupported storage provider: ${configsService.storageProvider}`,
        );
      },
      inject: [ConfigsService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
