import { PartialType } from '@nestjs/swagger';
import { CreateStaffManagementDto } from './create-staff-management.dto';

export class UpdateStaffManagementDto extends PartialType(CreateStaffManagementDto) {}
