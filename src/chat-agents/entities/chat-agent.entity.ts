import {
  ChatAgent as PrismaChatAgent,
  Prisma,
} from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ChatAgent implements PrismaChatAgent {
  @ApiProperty({
    description: 'The unique identifier of the chat agent',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the customer this chat agent belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  customerId: string;

  @ApiProperty({
    description: 'The name of the chat agent',
    example: 'Customer Support Bot',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the chat agent',
    example: 'An AI assistant for customer support inquiries',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'The system prompt for the chat agent',
    example:
      'You are a helpful customer support assistant. Always be polite and professional.',
  })
  systemPrompt: string;

  @ApiProperty({
    description: 'Configuration settings for the chat agent',
    example: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 },
    nullable: true,
  })
  config: Prisma.JsonValue;

  @ApiProperty({
    description: 'Whether the chat agent is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the chat agent was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the chat agent was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
