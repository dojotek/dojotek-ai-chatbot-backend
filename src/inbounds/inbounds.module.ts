import { Module } from '@nestjs/common';
import { SampleInboundService } from './services/sample-inbound.service';
import { SampleInboundController } from './controllers/sample-inbound.controller';
import { CachesModule } from 'src/caches/caches.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [SampleInboundController],
  providers: [SampleInboundService],
  exports: [SampleInboundService],
  imports: [
    CachesModule,
    BullModule.registerQueue({
      name: 'INBOUNDS/SAMPLE/v2025.09.05',
    }),
  ],
})
export class InboundsModule {}
