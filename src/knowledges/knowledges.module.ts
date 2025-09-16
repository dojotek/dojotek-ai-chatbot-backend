import { Module } from '@nestjs/common';
import { KnowledgesService } from './knowledges.service';
import { KnowledgesController } from './knowledges.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [PrismaModule, CachesModule, ConfigsModule],
  controllers: [KnowledgesController],
  providers: [KnowledgesService],
  exports: [KnowledgesService],
})
export class KnowledgesModule {}
