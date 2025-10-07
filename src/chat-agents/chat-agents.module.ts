import { Module } from '@nestjs/common';
import { ChatAgentsService } from './chat-agents.service';
import { ChatAgentInferencesService } from './chat-agent-inferences.service';
import { ChatAgentsController } from './chat-agents.controller';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';
import { LogsModule } from '../logs/logs.module';
import { ChatSessionsModule } from '../chat-sessions/chat-sessions.module';
import { ChatMessagesModule } from '../chat-messages/chat-messages.module';
import { ChatAgentConsumer } from './consumers/chat-agent.consumer';
import { VectorStorageModule } from '../vector-storage/vector-storage.module';
import { ChatAgentKnowledgesModule } from '../chat-agent-knowledges/chat-agent-knowledges.module';
import { KnowledgeFilesModule } from '../knowledge-files/knowledge-files.module';
import { BasicRagService } from './services/basic-rag.service';
import { CorrectiveRagService } from './services/corrective-rag.service';
import { SelfRagService } from './services/self-rag.service';
import { AgenticRagService } from './services/agentic-rag.service';

@Module({
  imports: [
    CachesModule,
    ConfigsModule,
    LogsModule,
    ChatSessionsModule,
    ChatMessagesModule,
    VectorStorageModule,
    ChatAgentKnowledgesModule,
    KnowledgeFilesModule,
  ],
  controllers: [ChatAgentsController],
  providers: [
    ChatAgentsService,
    ChatAgentInferencesService,
    ChatAgentConsumer,
    BasicRagService,
    CorrectiveRagService,
    SelfRagService,
    AgenticRagService,
  ],
  exports: [ChatAgentsService],
})
export class ChatAgentsModule {}
