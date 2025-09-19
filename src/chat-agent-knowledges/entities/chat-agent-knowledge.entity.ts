import { ApiProperty } from '@nestjs/swagger';
import type { ChatAgent, Knowledge } from '../../generated/prisma/client';

export class ChatAgentKnowledge {
  @ApiProperty({
    description:
      'The unique identifier of the chat agent knowledge association',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the chat agent',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  chatAgentId: string;

  @ApiProperty({
    description: 'The ID of the knowledge',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  knowledgeId: string;

  @ApiProperty({
    description:
      'Priority for knowledge ranking (1-10, higher number = higher priority)',
    example: 1,
    minimum: 1,
    maximum: 10,
  })
  priority: number;

  @ApiProperty({
    description: 'The timestamp when the association was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The associated chat agent',
    required: false,
  })
  chatAgent?: ChatAgent;

  @ApiProperty({
    description: 'The associated knowledge',
    required: false,
  })
  knowledge?: Knowledge;
}
