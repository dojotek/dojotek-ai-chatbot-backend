import { ChatMessage as PrismaChatMessage } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessage implements PrismaChatMessage {
  @ApiProperty({
    description: 'The unique identifier of the chat message',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the chat session this message belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  chatSessionId: string;

  @ApiProperty({
    description: 'The type of the message',
    example: 'user',
    enum: ['user', 'ai', 'system'],
  })
  messageType: string;

  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, how can I help you today?',
  })
  content: string;

  @ApiProperty({
    description: 'Additional metadata for the message (attachments, etc.)',
    example: { attachments: [], mentions: [] },
    nullable: true,
  })
  metadata: any;

  @ApiProperty({
    description: 'The platform-specific message ID',
    example: 'slack_msg_123456',
    nullable: true,
  })
  platformMessageId: string | null;

  @ApiProperty({
    description: 'The date when the message was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
