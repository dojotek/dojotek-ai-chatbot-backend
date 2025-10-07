import { Module } from '@nestjs/common';
import { SampleInboundService } from './services/sample-inbound.service';
import { SampleInboundController } from './controllers/sample-inbound.controller';
import { LarkInboundController } from './controllers/lark-inbound.controller';
import { LarkInboundService } from './services/lark-inbound.service';
import { LogsModule } from '../logs/logs.module';
import { CachesModule } from '../caches/caches.module';
import { ChatSessionsModule } from '../chat-sessions/chat-sessions.module';
import { ChatMessagesModule } from '../chat-messages/chat-messages.module';
import { ConfigsModule } from '../configs/configs.module';
import { ChatAgentsModule } from '../chat-agents/chat-agents.module';
import { CustomersModule } from '../customers/customers.module';
import { CustomerStaffsModule } from '../customer-staffs/customer-staffs.module';
import { ChannelsModule } from '../channels/channels.module';
import { CustomerStaffIdentitiesModule } from '../customer-staff-identities/customer-staff-identities.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [SampleInboundController, LarkInboundController],
  providers: [SampleInboundService, LarkInboundService],
  exports: [SampleInboundService, LarkInboundService],
  imports: [
    LogsModule,
    CachesModule,
    ChatSessionsModule,
    ChatMessagesModule,
    ConfigsModule,
    ChatAgentsModule,
    CustomersModule,
    CustomerStaffsModule,
    ChannelsModule,
    CustomerStaffIdentitiesModule,
    BullModule.registerQueue({
      name: 'inbounds-for-chat-agents',
    }),
  ],
})
export class InboundsModule {}
