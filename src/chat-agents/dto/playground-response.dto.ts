import { ApiProperty } from '@nestjs/swagger';

export class PlaygroundResponseDto {
  @ApiProperty({ description: 'AI response content' })
  answer: string;
}
