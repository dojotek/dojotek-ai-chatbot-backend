import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsUUID,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '../../generated/prisma/client';

export class CreateCustomerStaffIdentityDto {
  @ApiProperty({
    description: 'The ID of the customer staff',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  customerStaffId: string;

  @ApiProperty({
    description: 'The platform name',
    example: 'slack',
    enum: ['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'],
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsIn(['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'])
  platform: string;

  @ApiProperty({
    description: 'The platform user ID',
    example: 'U1234567890',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  platformUserId: string;

  @ApiProperty({
    description: 'Additional platform-specific data',
    example: {
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
    },
    required: false,
  })
  @IsOptional()
  platformData?: Prisma.InputJsonValue;

  @ApiProperty({
    description: 'Whether the customer staff identity is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
