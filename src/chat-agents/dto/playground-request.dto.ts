import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PlaygroundRequestDto {
  @ApiProperty({ description: 'Chat agent ID to use for inference' })
  @IsString()
  chatAgentId: string;

  @ApiProperty({ description: 'User query to run through the RAG pipeline' })
  @IsString()
  query: string;
}
