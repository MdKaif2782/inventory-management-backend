import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { BulkCreateEmployeeDto, CreateEmployeeDto, SearchEmployeeDto, UpdateEmployeeDto } from './dto';

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

   @Get('search')
  async search(@Query() searchDto: SearchEmployeeDto) {
    return this.employeeService.search(searchDto);
  }

  @Get('advanced-search')
  async advancedSearch(
    @Query('name') name?: string,
    @Query('department') department?: string,
    @Query('contact') contact?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.employeeService.advancedSearch({
      name,
      department,
      contact,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get('departments')
  async getDepartments() {
    return this.employeeService.getDepartments();
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
