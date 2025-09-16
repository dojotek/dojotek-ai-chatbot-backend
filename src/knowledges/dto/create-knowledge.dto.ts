import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKnowledgeDto {
  @ApiProperty({
    description: 'The name of the knowledge',
    example: 'Product Documentation',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'The description of the knowledge',
    example: 'Contains all product documentation and user guides',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The category of the knowledge',
    example: 'documentation',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiProperty({
    description: 'Whether the knowledge is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
