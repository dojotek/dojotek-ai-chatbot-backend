import { Module } from '@nestjs/common';
import { ChatAgentsService } from './chat-agents.service';
import { ChatAgentInferencesService } from './chat-agent-inferences.service';
import { ChatAgentsController } from './chat-agents.controller';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';
import { LogsModule } from '../logs/logs.module';
import { ChatSessionsModule } from '../chat-sessions/chat-sessions.module';
import { ChatMessagesModule } from '../chat-messages/chat-messages.module';
import { ChatAgentSampleConsumer } from './consumers/chat-agent-sample.consumer';

@Module({
  imports: [
    CachesModule,
    ConfigsModule,
    LogsModule,
    ChatSessionsModule,
    ChatMessagesModule,
  ],
  controllers: [ChatAgentsController],
  providers: [
    ChatAgentsService,
    ChatAgentInferencesService,
    ChatAgentSampleConsumer,
  ],
  exports: [ChatAgentsService],
})
export class ChatAgentsModule {}
