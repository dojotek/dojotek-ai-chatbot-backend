import { Module } from '@nestjs/common';
import { SampleOutbondService } from './services/sample-outbond.service';
import { SampleOutbondController } from './controllers/sample-outbond.controller';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';
import { BullModule } from '@nestjs/bullmq';
import { LarkOutboundService } from './services/lark-outbound.service';
import { OutboundConsumer } from './consumers/outbound.consumer';
import { LogsModule } from '../logs/logs.module';
import { ChatMessagesModule } from '../chat-messages/chat-messages.module';
import { ChatSessionsModule } from '../chat-sessions/chat-sessions.module';
import { CustomerStaffIdentitiesModule } from '../customer-staff-identities/customer-staff-identities.module';
import { SlackOutboundService } from './services/slack-outbound.service';

@Module({
  controllers: [SampleOutbondController],
  providers: [
    SampleOutbondService,
    LarkOutboundService,
    SlackOutboundService,
    OutboundConsumer,
  ],
  exports: [SampleOutbondService, LarkOutboundService, SlackOutboundService],
  imports: [
    CachesModule,
    ConfigsModule,
    LogsModule,
    BullModule.registerQueue({
      name: 'OUTBOUNDS/SAMPLE/v2025.09.05',
    }),
    BullModule.registerQueue({
      name: 'outbounds-from-chat-agents',
    }),
    ChatMessagesModule,
    ChatSessionsModule,
    CustomerStaffIdentitiesModule,
  ],
})
export class OutboundsModule {}
