import { ApiProperty } from '@nestjs/swagger';

export class FileChunkDto {
  @ApiProperty({ description: 'The text content of the document chunk' })
  content: string;

  @ApiProperty({
    description: 'Similarity score between query and chunk (0-1)',
    example: 0.85,
  })
  score: number;

  @ApiProperty({ description: 'Metadata associated with the chunk' })
  metadata: Record<string, any>;
}

export class PlaygroundResponseDto {
  @ApiProperty({
    description: 'Number of file chunks found for the query',
    example: 3,
  })
  fileChunkQuantity: number;

  @ApiProperty({
    description: 'Array of file chunks matching the query',
    type: [FileChunkDto],
  })
  fileChunks: FileChunkDto[];
}
