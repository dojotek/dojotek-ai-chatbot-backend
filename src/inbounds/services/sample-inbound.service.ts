import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class SampleInboundService {
  constructor(
    @InjectQueue('INBOUNDS/SAMPLE_INBOUND/v2025.09.05') private queue: Queue,
  ) {}

  async submit() {
    await this.queue.add('submit', {
      message: 'hello',
    });

    return 'OK';
  }
}
