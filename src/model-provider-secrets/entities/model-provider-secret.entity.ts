import { ApiProperty } from '@nestjs/swagger';

export class ModelProviderSecret {
  @ApiProperty({
    description: 'Unique identifier',
    example: '018f8b22-3e1a-7d5d-9a9b-6c2b73a2f9ab',
  })
  id: string;

  @ApiProperty({ description: 'Display name', example: 'Primary OpenAI Key' })
  name: string;

  @ApiProperty({ description: 'Provider/type', example: 'openai' })
  type: string;

  @ApiProperty({
    description: 'Pointer to secret storage (e.g., Infisical secret id)',
    required: false,
    nullable: true,
  })
  secretStoragePointer?: string | null;

  @ApiProperty({ description: 'Creation time (ISO string)' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update time (ISO string)' })
  updatedAt: Date;
}
