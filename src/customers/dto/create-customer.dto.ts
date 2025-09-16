import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'The name of the customer',
    example: 'PT. Teknologi Maju',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'The email of the customer',
    example: 'contact@teknologimaju.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The phone number of the customer',
    example: '+628123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    description: 'The address of the customer',
    example: 'Jl. Sudirman No. 123, Jakarta',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'The industry of the customer',
    example: 'Technology',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  industry?: string;

  @ApiProperty({
    description: 'The description of the customer',
    example: 'Leading technology company providing innovative solutions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the customer is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
