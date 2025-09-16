import { ChatSession as PrismaChatSession } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ChatSession implements PrismaChatSession {
  @ApiProperty({
    description: 'The unique identifier of the chat session',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the chat agent for this session',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  chatAgentId: string;

  @ApiProperty({
    description: 'The ID of the customer staff in this session',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  customerStaffId: string;

  @ApiProperty({
    description: 'The platform where this session takes place',
    example: 'slack',
    enum: ['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'],
  })
  platform: string;

  @ApiProperty({
    description: 'The platform-specific thread ID',
    example: 'C1234567890',
    nullable: true,
  })
  platformThreadId: string | null;

  @ApiProperty({
    description: 'Session data and metadata stored as JSON',
    example: { conversationContext: 'ongoing_support', metadata: {} },
    nullable: true,
  })
  sessionData: any;

  @ApiProperty({
    description: 'The status of the chat session',
    example: 'active',
    enum: ['active', 'expired', 'closed'],
  })
  status: string;

  @ApiProperty({
    description: 'When the session expires',
    example: '2023-01-02T00:00:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'The date when the chat session was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the chat session was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
