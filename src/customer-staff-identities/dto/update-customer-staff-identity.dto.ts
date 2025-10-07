import { PartialType } from '@nestjs/swagger';
import { CreateCustomerStaffIdentityDto } from './create-customer-staff-identity.dto';

export class UpdateCustomerStaffIdentityDto extends PartialType(
  CreateCustomerStaffIdentityDto,
) {}
