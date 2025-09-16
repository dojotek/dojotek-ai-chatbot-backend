import { Role as PrismaRole } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class Role implements PrismaRole {
  @ApiProperty({
    description: 'The unique identifier of the role',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the role',
    example: 'admin',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the role',
    example: 'Administrator role with full access',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'The permissions object for the role',
    example: { users: ['read', 'write'], roles: ['read'] },
    nullable: true,
  })
  permissions: any;

  @ApiProperty({
    description: 'The date when the role was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the role was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
