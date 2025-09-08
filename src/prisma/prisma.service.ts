import { Injectable, OnModuleInit, Global } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';

@Global()
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
