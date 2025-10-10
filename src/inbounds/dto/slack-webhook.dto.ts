import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SlackAuthorizationDto {
  @IsOptional()
  @IsString()
  enterprise_id?: string | null;

  @IsOptional()
  @IsString()
  team_id?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsBoolean()
  is_bot?: boolean;

  @IsOptional()
  @IsBoolean()
  is_enterprise_install?: boolean;
}

export class SlackEventItemDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  ts?: string;
}

export class SlackEventDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  user?: string;

  // Message event fields
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  ts?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  channel_type?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsString()
  client_msg_id?: string;

  // Slack rich text/message blocks (we don't validate inner structure)
  @IsOptional()
  @IsArray()
  blocks?: any[];

  // Keep reaction-related optional fields for other event types
  @IsOptional()
  @ValidateNested()
  @Type(() => SlackEventItemDto)
  item?: SlackEventItemDto;

  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsString()
  item_user?: string;

  @IsOptional()
  @IsString()
  event_ts?: string;
}

export class SlackWebhookDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  team_id?: string;

  @IsOptional()
  @IsString()
  api_app_id?: string;

  @ValidateNested()
  @Type(() => SlackEventDto)
  event!: SlackEventDto;

  @IsString()
  @IsIn(['event_callback'])
  type!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authed_users?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlackAuthorizationDto)
  authorizations?: SlackAuthorizationDto[];

  @IsOptional()
  @IsString()
  event_id?: string;

  @IsOptional()
  @IsString()
  event_context?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  event_time?: number;

  // Additional fields seen in payloads
  @IsOptional()
  @IsString()
  context_team_id?: string;

  @IsOptional()
  @IsString()
  context_enterprise_id?: string | null;

  @IsOptional()
  @IsBoolean()
  is_ext_shared_channel?: boolean;
}
