import { PartialType } from '@nestjs/swagger';
import { CreateCustomerStaffDto } from './create-customer-staff.dto';

export class UpdateCustomerStaffDto extends PartialType(
  CreateCustomerStaffDto,
) {
  // All fields from CreateCustomerStaffDto are now optional
  // customerId, name, email, phone, department, position can all be updated
}
