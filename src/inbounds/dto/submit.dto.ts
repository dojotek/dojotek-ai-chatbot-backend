import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitDto {
  @ApiProperty({
    description: 'The ID of the chat agent',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  chatAgentId: string;

  @ApiProperty({
    description: 'The ID of the customer',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'The ID of the customer staff',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  customerStaffId: string;

  @ApiProperty({
    description: 'The platform where the message originated',
    example: 'slack',
  })
  @IsString()
  platform: string;

  @ApiProperty({
    description: 'The message content',
    example: 'Hello, I need help with my account',
  })
  @IsString()
  message: string;
}
