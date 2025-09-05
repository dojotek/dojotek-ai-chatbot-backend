import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CachesService } from '../../caches/caches.service';

@Injectable()
export class SampleOutbondService {
  constructor(
    private readonly cachesService: CachesService,
    @InjectQueue('OUTBOUNDS/SAMPLE/v2025.09.05') private queue: Queue,
  ) {}

  async submit() {
    await this.cachesService.set('OUTBOUNDS/SAMPLE/v2025.09.05', 'hello', 60);

    await this.queue.add('submit', {
      message: 'hello',
    });

    return 'OK';
  }
}
