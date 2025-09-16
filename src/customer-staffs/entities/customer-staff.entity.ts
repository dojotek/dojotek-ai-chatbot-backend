import { CustomerStaff as PrismaCustomerStaff } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerStaff implements PrismaCustomerStaff {
  @ApiProperty({
    description: 'The unique identifier of the customer staff',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the customer this staff belongs to',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  customerId: string;

  @ApiProperty({
    description: 'The name of the customer staff',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'The email address of the customer staff',
    example: 'john.doe@company.com',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: 'The phone number of the customer staff',
    example: '+628123456789',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'The department of the customer staff',
    example: 'IT Support',
    nullable: true,
  })
  department: string | null;

  @ApiProperty({
    description: 'The position of the customer staff',
    example: 'Software Engineer',
    nullable: true,
  })
  position: string | null;

  @ApiProperty({
    description: 'Whether the customer staff is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the customer staff was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the customer staff was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
