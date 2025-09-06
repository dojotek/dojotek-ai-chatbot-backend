import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CachesService } from '../../caches/caches.service';
import { LogsService } from '../../logs/logs.service';

@Injectable()
export class SampleInboundService {
  constructor(
    private readonly cachesService: CachesService,
    private readonly logsService: LogsService,
    @InjectQueue('INBOUNDS/SAMPLE/v2025.09.05') private queue: Queue,
  ) {}

  async submit() {
    this.logsService.debug(
      'Starting sample inbound submission process',
      'SampleInboundService',
    );

    try {
      this.logsService.log(
        'Setting cache value for sample inbound',
        'SampleInboundService',
      );
      await this.cachesService.set('INBOUNDS/SAMPLE/v2025.09.05', 'hello', 60);

      this.logsService.log(
        'Adding job to queue for processing',
        'SampleInboundService',
      );
      await this.queue.add('submit', {
        message: 'hello',
        timestamp: new Date().toISOString(),
        service: 'sample-inbound',
      });

      this.logsService.log(
        'Sample inbound submission completed successfully',
        'SampleInboundService',
      );
      return 'OK';
    } catch (error) {
      this.logsService.error(
        'Failed to submit sample inbound request',
        error instanceof Error ? error.stack : String(error),
        'SampleInboundService',
      );
      throw error;
    }
  }

  simulateWarning() {
    this.logsService.warn(
      'This is a sample warning message for demonstration',
      'SampleInboundService',
    );
    return 'Warning logged';
  }

  simulateError() {
    this.logsService.error(
      'This is a sample error message for demonstration',
      'Error stack trace would go here',
      'SampleInboundService',
    );
    return 'Error logged';
  }

  simulateDebug() {
    this.logsService.debug(
      'This is a sample debug message for demonstration',
      'SampleInboundService',
    );
    return 'Debug logged';
  }
}
