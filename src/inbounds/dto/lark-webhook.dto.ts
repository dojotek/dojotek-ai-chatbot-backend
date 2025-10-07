import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class LarkWebhookHeaderDto {
  @IsString()
  event_id!: string;

  @IsString()
  event_type!: string;

  @IsString()
  create_time!: string; // epoch millis as string per Lark spec

  @IsString()
  token!: string;

  @IsString()
  app_id!: string;

  @IsString()
  tenant_key!: string;
}

export class LarkSenderIdDto {
  @IsOptional()
  @IsString()
  union_id?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  open_id?: string;
}

export class LarkSenderDto {
  @ValidateNested()
  @Type(() => LarkSenderIdDto)
  sender_id!: LarkSenderIdDto;

  @IsString()
  @IsIn(['user', 'bot'])
  sender_type!: string;

  @IsOptional()
  @IsString()
  tenant_key?: string;
}

export class LarkMessageDto {
  @IsString()
  message_id!: string;

  @IsOptional()
  @IsString()
  root_id?: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsString()
  create_time!: string; // epoch millis as string

  @IsString()
  chat_id!: string;

  @IsString()
  @IsIn(['group', 'p2p'])
  chat_type!: string;

  @IsString()
  message_type!: string; // e.g. text, image, etc.

  @IsString()
  content!: string; // JSON string from Lark

  @IsOptional()
  @IsString()
  update_time?: string; // epoch millis as string
}

export class LarkEventDto {
  @ValidateNested()
  @Type(() => LarkSenderDto)
  sender!: LarkSenderDto;

  @ValidateNested()
  @Type(() => LarkMessageDto)
  message!: LarkMessageDto;
}

export class LarkWebhookDto {
  @IsString()
  schema!: string;

  @ValidateNested()
  @Type(() => LarkWebhookHeaderDto)
  header!: LarkWebhookHeaderDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LarkEventDto)
  event!: LarkEventDto;
}
