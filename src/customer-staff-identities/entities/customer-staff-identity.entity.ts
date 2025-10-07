import {
  CustomerStaffIdentity as PrismaCustomerStaffIdentity,
  Prisma,
} from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerStaffIdentity implements PrismaCustomerStaffIdentity {
  @ApiProperty({
    description: 'The unique identifier of the customer staff identity',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the customer staff',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  customerStaffId: string;

  @ApiProperty({
    description: 'The platform name',
    example: 'slack',
    enum: ['slack', 'discord', 'teams', 'lark', 'telegram', 'whatsapp'],
  })
  platform: string;

  @ApiProperty({
    description: 'The platform user ID',
    example: 'U1234567890',
  })
  platformUserId: string;

  @ApiProperty({
    description: 'Additional platform-specific data',
    example: {
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
    },
    nullable: true,
  })
  platformData: Prisma.JsonValue | null;

  @ApiProperty({
    description: 'Whether the customer staff identity is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the customer staff identity was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the customer staff identity was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
