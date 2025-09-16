import { Module } from '@nestjs/common';
import { KnowledgeFilesService } from './knowledge-files.service';
import { KnowledgeFilesController } from './knowledge-files.controller';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [CachesModule, ConfigsModule],
  controllers: [KnowledgeFilesController],
  providers: [KnowledgeFilesService],
  exports: [KnowledgeFilesService],
})
export class KnowledgeFilesModule {}
