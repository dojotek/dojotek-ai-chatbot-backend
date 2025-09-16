import { KnowledgeFile as PrismaKnowledgeFile } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class KnowledgeFile implements PrismaKnowledgeFile {
  @ApiProperty({
    description: 'The unique identifier of the knowledge file',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the knowledge container',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  knowledgeId: string;

  @ApiProperty({
    description: 'The name of the file',
    example: 'document.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'The URL where the file is stored',
    example: 'https://storage.example.com/files/document.pdf',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'The type/format of the file',
    example: 'application/pdf',
  })
  fileType: string;

  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 1024000,
    nullable: true,
  })
  fileSize: number | null;

  @ApiProperty({
    description: 'The processing status of the file',
    example: 'processed',
    enum: ['pending', 'processing', 'processed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Whether the knowledge file is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the knowledge file was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the knowledge file was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
