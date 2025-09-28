import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { BulkCreateEmployeeDto, CreateEmployeeDto, UpdateEmployeeDto } from './dto';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

@Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(createEmployeeDto);
  }

  @Post('bulk')
  async bulkCreate(@Body() bulkCreateEmployeeDto: BulkCreateEmployeeDto) {
    return this.employeeService.bulkCreateEmployee(bulkCreateEmployeeDto);
    // Or use the transaction version:
    // return this.staffService.bulkCreateWithTransaction(bulkCreateEmployeeDto);
  }

  @Get()
  async findAll() {
    return this.employeeService.findAllEmployee();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.employeeService.findOneEmployee(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(id, updateEmployeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.employeeService.removeEmployee(id);
  }
}
