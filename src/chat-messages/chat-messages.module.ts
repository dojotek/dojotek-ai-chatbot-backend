import { Module } from '@nestjs/common';
import { ChatMessagesService } from './chat-messages.service';
import { ChatMessagesController } from './chat-messages.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CachesModule } from '../caches/caches.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [CachesModule, ConfigsModule],
  controllers: [ChatMessagesController],
  providers: [ChatMessagesService, PrismaService],
  exports: [ChatMessagesService],
})
export class ChatMessagesModule {}
