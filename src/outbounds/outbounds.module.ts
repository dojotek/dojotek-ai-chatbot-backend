import { Module } from '@nestjs/common';
import { SampleOutbondService } from './services/sample-outbond.service';
import { SampleOutbondController } from './controllers/sample-outbond.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [SampleOutbondController],
  providers: [SampleOutbondService],
  exports: [SampleOutbondService],
  imports: [
    BullModule.registerQueue({
      name: 'OUTBOUNDS/SAMPLE_OUTBOUND/v2025.09.05',
    }),
  ],
})
export class OutboundsModule {}
