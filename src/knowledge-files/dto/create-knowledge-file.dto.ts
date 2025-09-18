import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsIn,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKnowledgeFileDto {
  @ApiProperty({
    description: 'The ID of the knowledge container',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  knowledgeId: string;

  @ApiProperty({
    description:
      'The name of the file (must have .txt, .doc, .docx, or .pdf extension)',
    example: 'document.pdf',
  })
  @IsString()
  @Matches(/\.(txt|doc|docx|pdf)$/i, {
    message: 'File must have a valid extension: .txt, .doc, .docx, or .pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'The type/format of the file',
    example: 'application/pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 1024000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  fileSize?: number;

  @ApiProperty({
    description: 'The processing status of the file',
    example: 'pending',
    enum: ['pending', 'processing', 'processed', 'failed'],
    default: 'pending',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'processed', 'failed'])
  status?: string;

  @ApiProperty({
    description: 'Whether the knowledge file is active',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
