import { Setting as PrismaSetting } from '../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class Setting implements PrismaSetting {
  @ApiProperty({
    description: 'Unique identifier',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({ description: 'Setting key', example: 'OPENAI_API_KEY' })
  key: string;

  @ApiProperty({
    description: 'Setting value (may be redacted if Sensitive)',
    example: 'sk-****abcd',
  })
  value: string;

  @ApiProperty({
    description: 'Optional description',
    example: 'API key for OpenAI',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Category of the setting',
    example: 'Sensitive',
    nullable: true,
  })
  category: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Update timestamp' })
  updatedAt: Date;
}
