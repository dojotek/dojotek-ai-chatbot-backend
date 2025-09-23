import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({ description: 'Setting key', example: 'OPENAI_API_KEY' })
  @IsString()
  @MaxLength(255)
  key: string;

  @ApiProperty({ description: 'Setting value', example: 'sk-xxxx' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Optional description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Category of the setting',
    required: false,
    example: 'Sensitive',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
