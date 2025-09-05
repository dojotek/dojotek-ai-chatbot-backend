import { Module } from '@nestjs/common';
import { ConfigsService } from './configs.service';

@Module({
  controllers: [],
  providers: [ConfigsService],
  exports: [ConfigsService],
})
export class ConfigsModule {}
