import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChannelDto {
  @ApiProperty({
    description: 'The ID of the chat agent this channel belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  @IsNotEmpty()
  chatAgentId: string;

  @ApiProperty({
    description: 'The name of the channel',
    example: 'Customer Support Channel',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'The description of the channel',
    example: 'Main customer support channel for handling inquiries',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The platform this channel is configured for',
    example: 'slack',
    enum: ['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'])
  platform: string;

  @ApiProperty({
    description: 'The workspace ID on the platform',
    example: 'T1234567890',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  workspaceId: string;

  @ApiProperty({
    description: 'Whether the channel is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
