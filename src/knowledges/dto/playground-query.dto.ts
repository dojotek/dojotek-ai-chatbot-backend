import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PlaygroundQueryDto {
  @ApiProperty({
    description: 'The query string to search for across knowledge files',
    example: 'What is machine learning?',
  })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({
    description:
      'Optional array of Knowledge File UUIDs to restrict the search scope. If empty, search across all files in the knowledge',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987e6543-e21a-12d3-a456-426614174000',
    ],
    required: false,
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  knowledgeFileIds: string[] = [];
}
