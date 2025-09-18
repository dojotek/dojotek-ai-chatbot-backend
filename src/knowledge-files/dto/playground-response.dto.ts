import { ApiProperty } from '@nestjs/swagger';

export class FileChunkDto {
  @ApiProperty({
    description: 'The text content of the document chunk',
    example: 'Machine learning is a subset of artificial intelligence...',
  })
  content: string;

  @ApiProperty({
    description: 'Similarity score between query and chunk (0-1)',
    example: 0.85,
  })
  score: number;

  @ApiProperty({
    description: 'Metadata associated with the chunk',
    example: {
      source: 'document.pdf#doc-0-chunk-5',
      knowledgeFileId: '123e4567-e89b-12d3-a456-426614174000',
      knowledgeId: '987e6543-e21a-12d3-a456-426614174000',
      fileName: 'document.pdf',
      fileType: 'application/pdf',
      chunkIndex: 5,
      documentIndex: 0,
    },
  })
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
