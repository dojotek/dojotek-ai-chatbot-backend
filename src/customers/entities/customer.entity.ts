import { Customer as PrismaCustomer } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class Customer implements PrismaCustomer {
  @ApiProperty({
    description: 'The unique identifier of the customer',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the customer',
    example: 'PT. Teknologi Maju',
  })
  name: string;

  @ApiProperty({
    description: 'The email of the customer',
    example: 'contact@teknologimaju.com',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: 'The phone number of the customer',
    example: '+628123456789',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'The address of the customer',
    example: 'Jl. Sudirman No. 123, Jakarta',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: 'The industry of the customer',
    example: 'Technology',
    nullable: true,
  })
  industry: string | null;

  @ApiProperty({
    description: 'The description of the customer',
    example: 'Leading technology company providing innovative solutions',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Whether the customer is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the customer was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the customer was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
