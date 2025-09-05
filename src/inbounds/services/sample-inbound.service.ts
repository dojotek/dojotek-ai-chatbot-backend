import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CachesService } from '../../caches/caches.service';

@Injectable()
export class SampleInboundService {
  constructor(
    private readonly cachesService: CachesService,
    @InjectQueue('INBOUNDS/SAMPLE/v2025.09.05') private queue: Queue,
  ) {}

  async submit() {
    await this.cachesService.set('INBOUNDS/SAMPLE/v2025.09.05', 'hello', 60);

    await this.queue.add('submit', {
      message: 'hello',
    });

    return 'OK';
  }
}
