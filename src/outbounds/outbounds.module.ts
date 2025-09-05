import { Module } from '@nestjs/common';
import { SampleOutbondService } from './services/sample-outbond.service';
import { SampleOutbondController } from './controllers/sample-outbond.controller';
import { CachesModule } from 'src/caches/caches.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [SampleOutbondController],
  providers: [SampleOutbondService],
  exports: [SampleOutbondService],
  imports: [
    CachesModule,
    BullModule.registerQueue({
      name: 'OUTBOUNDS/SAMPLE/v2025.09.05',
    }),
  ],
})
export class OutboundsModule {}
