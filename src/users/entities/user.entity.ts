import { User as PrismaUser } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class User implements PrismaUser {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The hashed password of the user',
    example: '$2b$10$...',
    writeOnly: true,
  })
  password: string;

  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'The ID of the role assigned to the user',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  roleId: string;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the user was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the user was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
