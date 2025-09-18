import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PlaygroundQueryDto {
  @ApiProperty({
    description: 'The query string to search for in the knowledge file',
    example: 'What is machine learning?',
  })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({
    description: 'The UUID of the knowledge file to search in',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  knowledgeFileId: string;
}
