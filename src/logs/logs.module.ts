import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [ConfigsModule],
  controllers: [],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
