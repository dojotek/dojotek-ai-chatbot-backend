import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatSessionDto {
  @ApiProperty({
    description: 'The ID of the chat agent for this session',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  chatAgentId: string;

  @ApiProperty({
    description: 'The ID of the customer staff in this session',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  customerStaffId: string;

  @ApiProperty({
    description: 'The platform where this session takes place',
    example: 'slack',
    enum: ['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'],
  })
  @IsString()
  @IsEnum(['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'])
  platform: string;

  @ApiProperty({
    description: 'The platform-specific thread ID',
    example: 'C1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  platformThreadId?: string;

  @ApiProperty({
    description: 'Session data and metadata stored as JSON',
    example: { conversationContext: 'ongoing_support', metadata: {} },
    required: false,
  })
  @IsOptional()
  @IsObject()
  sessionData?: any;

  @ApiProperty({
    description: 'The status of the chat session',
    example: 'active',
    enum: ['active', 'expired', 'closed'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['active', 'expired', 'closed'])
  status?: string;

  @ApiProperty({
    description: 'When the session expires (ISO string)',
    example: '2023-01-02T00:00:00.000Z',
  })
  @IsDateString()
  expiresAt: string;
}
