import { Module } from '@nestjs/common';
import { ChatAgentKnowledgesService } from './chat-agent-knowledges.service';
import { ChatAgentKnowledgesController } from './chat-agent-knowledges.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [PrismaModule, CachesModule, ConfigsModule],
  controllers: [ChatAgentKnowledgesController],
  providers: [ChatAgentKnowledgesService],
  exports: [ChatAgentKnowledgesService],
})
export class ChatAgentKnowledgesModule {}
