import { Module } from '@nestjs/common';
import { ChatAgentsService } from './chat-agents.service';
import { ChatAgentsController } from './chat-agents.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [CachesModule, ConfigsModule],
  controllers: [ChatAgentsController],
  providers: [ChatAgentsService, PrismaService],
  exports: [ChatAgentsService],
})
export class ChatAgentsModule {}
