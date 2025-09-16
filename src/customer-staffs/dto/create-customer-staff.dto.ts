import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerStaffDto {
  @ApiProperty({
    description: 'The ID of the customer this staff belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'The name of the customer staff',
    example: 'John Doe',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The email address of the customer staff',
    example: 'john.doe@company.com',
    required: false,
    format: 'email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'The phone number of the customer staff',
    example: '+628123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'The department of the customer staff',
    example: 'IT Support',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: 'The position of the customer staff',
    example: 'Software Engineer',
    required: false,
  })
  @IsOptional()
  @IsString()
  position?: string;
}
