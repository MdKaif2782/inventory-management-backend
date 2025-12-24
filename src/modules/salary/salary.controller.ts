import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SalaryService } from './salary.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  BulkSalaryProcessDto,
  UpdateSalaryPaymentDto,
  MonthYearDto,
} from './dto';
import { StaffRole } from '@prisma/client';

@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  // ================= EMPLOYEE ENDPOINTS =================

  @Post('employees')
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.salaryService.createEmployee(createEmployeeDto);
  }

  @Get('employees')
  async getAllEmployees(@Query('includeInactive') includeInactive?: string) {
    return this.salaryService.getAllEmployees(includeInactive === 'true');
  }

  @Get('employees/:id')
  async getEmployeeById(@Param('id') id: string) {
    return this.salaryService.getEmployeeById(id);
  }

  @Put('employees/:id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.salaryService.updateEmployee(id, updateEmployeeDto);
  }

  @Delete('employees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmployee(@Param('id') id: string) {
    return this.salaryService.deleteEmployee(id);
  }

  // ================= SALARY ENDPOINTS =================

  @Post('process')
  async processSalary(@Body() bulkDto: BulkSalaryProcessDto) {
    return this.salaryService.processSalary(bulkDto);
  }

  @Get('payments')
  async getSalaryPayments(@Query() monthYear?: MonthYearDto) {
    return this.salaryService.getSalaryPayments(monthYear);
  }

  @Get('unpaid/:month/:year')
  async getUnpaidEmployees(
    @Param('month') month: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.salaryService.getUnpaidEmployees(month, year);
  }

  @Get('report/:month/:year')
  async getSalaryReport(
    @Param('month') month: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.salaryService.getSalaryReport(month, year);
  }

  @Get('employees/:employeeId/payments')
  async getEmployeePaymentHistory(@Param('employeeId') employeeId: string) {
    return this.salaryService.getEmployeePaymentHistory(employeeId);
  }

  @Get('payments/:id')
  async getSalaryPayment(@Param('id') id: string) {
    return this.salaryService.getSalaryPayment(id);
  }

  @Put('payments/:id')
  async updateSalaryPayment(
    @Param('id') id: string,
    @Body() updateDto: UpdateSalaryPaymentDto,
  ) {
    return this.salaryService.updateSalaryPayment(id, updateDto);
  }

  @Delete('payments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSalaryPayment(@Param('id') id: string) {
    return this.salaryService.deleteSalaryPayment(id);
  }
}