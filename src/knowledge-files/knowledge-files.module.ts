import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeFilesService } from './knowledge-files.service';
import { KnowledgeFilesController } from './knowledge-files.controller';
import { VectorizeKnowledgeFileConsumer } from './consumers/vectorize-knowledge-file.consumer';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';
import { LogsModule } from '../logs/logs.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    CachesModule,
    ConfigsModule,
    LogsModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'knowledge-files/vectorize',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [KnowledgeFilesController],
  providers: [KnowledgeFilesService, VectorizeKnowledgeFileConsumer],
  exports: [KnowledgeFilesService],
})
export class KnowledgeFilesModule {}
