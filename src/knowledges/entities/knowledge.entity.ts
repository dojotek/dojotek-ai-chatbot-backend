import { Knowledge as PrismaKnowledge } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class Knowledge implements PrismaKnowledge {
  @ApiProperty({
    description: 'The unique identifier of the knowledge',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the knowledge',
    example: 'Product Documentation',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the knowledge',
    example: 'Contains all product documentation and user guides',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'The category of the knowledge',
    example: 'documentation',
    nullable: true,
  })
  category: string | null;

  @ApiProperty({
    description: 'Whether the knowledge is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The date when the knowledge was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the knowledge was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
