import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StaffService } from './staff-management.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  ChangePasswordDto,
  SearchStaffDto,
} from './dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Get()
  findAll(@Query() searchParams: SearchStaffDto) {
    return this.staffService.findAll(searchParams);
  }

  @Get('stats')
  getStats() {
    return this.staffService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Get('staff-id/:staffId')
  findByStaffId(@Param('staffId') staffId: string) {
    return this.staffService.findByStaffId(staffId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Patch(':id/password')
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.staffService.changePassword(id, changePasswordDto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.staffService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.staffService.deactivate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}