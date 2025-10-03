import { Module } from '@nestjs/common';
import { ModelProviderSecretsService } from './model-provider-secrets.service';
import { ModelProviderSecretsController } from './model-provider-secrets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [PrismaModule, ConfigsModule],
  controllers: [ModelProviderSecretsController],
  providers: [ModelProviderSecretsService],
})
export class ModelProviderSecretsModule {}
