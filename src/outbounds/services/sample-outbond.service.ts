import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class SampleOutbondService {
  constructor(
    @InjectQueue('OUTBOUNDS/SAMPLE_OUTBOUND/v2025.09.05') private queue: Queue,
  ) {}

  async submit() {
    await this.queue.add('submit', {
      message: 'hello',
    });

    return 'OK';
  }
}
