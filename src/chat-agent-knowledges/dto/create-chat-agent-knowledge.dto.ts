import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatAgentKnowledgeDto {
  @ApiProperty({
    description: 'The ID of the chat agent',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  chatAgentId: string;

  @ApiProperty({
    description: 'The ID of the knowledge to associate with the chat agent',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  knowledgeId: string;

  @ApiProperty({
    description:
      'Priority for knowledge ranking (1-10, higher number = higher priority)',
    example: 1,
    minimum: 1,
    maximum: 10,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}
