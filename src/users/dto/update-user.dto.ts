import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // All fields from CreateUserDto are now optional
  // password field will be hashed if provided
}
