import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class PresignDownloadRequestDto {
  @ApiProperty({
    description: 'The key/path for the file in storage',
    example: 'documents/2024/01/file.pdf',
  })
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: 'URL expiration time in minutes (default: 60, max: 1440)',
    example: 60,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  expiresInMinutes?: number;
}

export class PresignDownloadResponseDto {
  @ApiProperty({
    description: 'HTTP method to use for download',
    example: 'GET',
  })
  method: 'GET';

  @ApiProperty({
    description: 'The file key/path',
    example: 'documents/2024/01/file.pdf',
  })
  key: string;

  @ApiProperty({
    description: 'Presigned URL for downloading',
    example: 'https://mybucket.s3.amazonaws.com/documents/2024/01/file.pdf?...',
  })
  url: string;

  @ApiProperty({
    description: 'URL expiration time in minutes',
    example: 60,
  })
  expiresInMinutes: number;
}
