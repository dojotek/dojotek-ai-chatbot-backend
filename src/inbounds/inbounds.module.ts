import { Module } from '@nestjs/common';
import { SampleInboundService } from './services/sample-inbound.service';
import { SampleInboundController } from './controllers/sample-inbound.controller';
import { LogsModule } from 'src/logs/logs.module';
import { CachesModule } from 'src/caches/caches.module';
import { ChatSessionsModule } from 'src/chat-sessions/chat-sessions.module';
import { ChatMessagesModule } from 'src/chat-messages/chat-messages.module';
import { ConfigsModule } from 'src/configs/configs.module';
import { ChatAgentsModule } from 'src/chat-agents/chat-agents.module';
import { CustomersModule } from 'src/customers/customers.module';
import { CustomerStaffsModule } from 'src/customer-staffs/customer-staffs.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [SampleInboundController],
  providers: [SampleInboundService],
  exports: [SampleInboundService],
  imports: [
    LogsModule,
    CachesModule,
    ChatSessionsModule,
    ChatMessagesModule,
    ConfigsModule,
    ChatAgentsModule,
    CustomersModule,
    CustomerStaffsModule,
    BullModule.registerQueue({
      name: 'inbounds-for-chat-agents',
    }),
  ],
})
export class InboundsModule {}
