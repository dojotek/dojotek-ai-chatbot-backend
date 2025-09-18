import { IsString, IsOptional, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcknowledgeUploadDto {
  @ApiProperty({
    description: 'The ID of the knowledge file',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The actual size of the uploaded file in bytes',
    example: 1024000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  fileSize?: number;
}
