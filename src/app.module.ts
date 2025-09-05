import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigsModule } from './configs/configs.module';
import { ConfigsService } from './configs/configs.service';

import { InboundsModule } from './inbounds/inbounds.module';
import { OutboundsModule } from './outbounds/outbounds.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['env_files/development.env', '.env'],
      expandVariables: true,
    }),
    ConfigsModule,

    BullModule.forRootAsync({
      imports: [ConfigsModule],
      useFactory: (configsService: ConfigsService) => ({
        connection: {
          host: configsService.messageQueueValkeyHost,
          port: configsService.messageQueueValkeyPort,
        },
        prefix: 'BULLMQ_QUEUE',
      }),
      inject: [ConfigsService],
    }),

    InboundsModule,
    OutboundsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
