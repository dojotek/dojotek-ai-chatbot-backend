import { Module } from '@nestjs/common';
import { SampleInboundService } from './services/sample-inbound.service';
import { SampleInboundController } from './controllers/sample-inbound.controller';
import { LogsModule } from 'src/logs/logs.module';
import { CachesModule } from 'src/caches/caches.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [SampleInboundController],
  providers: [SampleInboundService],
  exports: [SampleInboundService],
  imports: [
    LogsModule,
    CachesModule,
    BullModule.registerQueue({
      name: 'INBOUNDS/SAMPLE/v2025.09.05',
    }),
  ],
})
export class InboundsModule {}
