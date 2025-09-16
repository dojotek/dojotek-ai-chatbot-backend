import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export class CreateChatMessageDto {
  @ApiProperty({
    description: 'The ID of the chat session this message belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  chatSessionId: string;

  @ApiProperty({
    description: 'The type of the message',
    example: 'user',
    enum: MessageType,
  })
  @IsEnum(MessageType)
  messageType: MessageType;

  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, how can I help you today?',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Additional metadata for the message (attachments, etc.)',
    example: { attachments: [], mentions: [] },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiProperty({
    description: 'The platform-specific message ID',
    example: 'slack_msg_123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  platformMessageId?: string;
}
