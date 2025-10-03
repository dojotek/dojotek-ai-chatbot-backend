import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateModelProviderSecretDto {
  @ApiProperty({
    description: 'The display name of the secret',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description:
      'The provider/type of the secret (e.g., openai, anthropic, gemini, openrouter)',
    maxLength: 100,
    examples: ['openai', 'anthropic', 'gemini', 'openrouter'],
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type: string;

  @ApiProperty({
    description:
      'The secret value (API key) to store in external secret storage',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  secret: string;
}
