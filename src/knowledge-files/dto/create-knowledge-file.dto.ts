import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsIn,
  IsUrl,
  IsBoolean,
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
    description: 'The name of the file',
    example: 'document.pdf',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'The URL where the file is stored',
    example: 'https://storage.example.com/files/document.pdf',
  })
  @IsUrl()
  fileUrl: string;

  @ApiProperty({
    description: 'The type/format of the file',
    example: 'application/pdf',
  })
  @IsString()
  fileType: string;

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
