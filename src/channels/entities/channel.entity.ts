import { Channel as PrismaChannel } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class Channel implements PrismaChannel {
  @ApiProperty({
    description: 'The unique identifier of the channel',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the chat agent this channel belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  chatAgentId: string;

  @ApiProperty({
    description: 'The name of the channel',
    example: 'Customer Support Channel',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the channel',
    example: 'Main customer support channel for handling inquiries',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'The platform this channel is configured for',
    example: 'slack',
    enum: ['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'],
  })
  platform: string;

  @ApiProperty({
    description: 'The workspace ID on the platform',
    example: 'T1234567890',
  })
  workspaceId: string;

  @ApiProperty({
    description: 'Whether the channel is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the channel was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the channel was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
