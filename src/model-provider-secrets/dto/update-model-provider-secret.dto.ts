import { PartialType } from '@nestjs/swagger';
import { CreateModelProviderSecretDto } from './create-model-provider-secret.dto';

export class UpdateModelProviderSecretDto extends PartialType(
  CreateModelProviderSecretDto,
) {}
