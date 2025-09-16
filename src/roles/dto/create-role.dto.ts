import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'admin',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'The description of the role',
    example: 'Administrator role with full access',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The permissions object for the role',
    example: { users: ['read', 'write'], roles: ['read'] },
    required: false,
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}
