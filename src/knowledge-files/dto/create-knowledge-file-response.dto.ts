import { ApiProperty } from '@nestjs/swagger';
import { KnowledgeFile } from '../entities/knowledge-file.entity';

export class CreateKnowledgeFileResponseDto {
  @ApiProperty({
    description: 'The created knowledge file',
    type: KnowledgeFile,
  })
  knowledgeFile: KnowledgeFile;

  @ApiProperty({
    description: 'Presigned URL for uploading the file',
    example:
      'https://s3.amazonaws.com/bucket/knowledge-files/2023-12-25/uuid.pdf?presigned=true',
  })
  uploadUrl: string;

  @ApiProperty({
    description: 'The storage key where the file will be stored',
    example:
      'knowledge-files/2023-12-25/01234567-89ab-cdef-0123-456789abcdef.pdf',
  })
  storageKey: string;

  @ApiProperty({
    description: 'HTTP method to use for the upload',
    example: 'PUT',
  })
  method: string;

  @ApiProperty({
    description: 'Upload expiration time in minutes',
    example: 60,
  })
  expiresInMinutes: number;
}
