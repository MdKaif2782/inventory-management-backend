import { Module } from '@nestjs/common';
import { StaffService } from './staff-management.service';
import { StaffController } from './staff-management.controller';

@Module({
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService],
})
export class StaffManagementModule {}
