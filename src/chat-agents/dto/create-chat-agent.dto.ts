import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '../../generated/prisma/client';

export class CreateChatAgentDto {
  @ApiProperty({
    description: 'The ID of the customer this chat agent belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'The name of the chat agent',
    example: 'Customer Support Bot',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The description of the chat agent',
    example: 'An AI assistant for customer support inquiries',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The system prompt for the chat agent',
    example:
      'You are a helpful customer support assistant. Always be polite and professional.',
  })
  @IsString()
  systemPrompt: string;

  @ApiProperty({
    description: 'Configuration settings for the chat agent',
    example: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 },
    required: false,
  })
  @IsOptional()
  config?: Prisma.InputJsonValue;

  @ApiProperty({
    description: 'Whether the chat agent is active',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
