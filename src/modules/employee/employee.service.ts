import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmployeeResponseDto, BulkCreateEmployeeDto, CreateEmployeeDto, UpdateEmployeeDto, SearchResponseDto, SearchEmployeeDto } from './dto';

@Injectable()
export class EmployeeService {
constructor(private readonly databaseService:DatabaseService){}  
async createEmployee(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    try {
      const employee = await this.databaseService.employee.create({
        data: createEmployeeDto,
      });
      return new EmployeeResponseDto(employee);
    } catch (error) {
      throw new BadRequestException('Failed to create employee');
    }
  }

  async findAllEmployee(): Promise<EmployeeResponseDto[]> {
    const employees = await this.databaseService.employee.findMany({
      orderBy: { name: 'asc' },
    });
    return employees.map(employee => new EmployeeResponseDto(employee));
  }

  async findOneEmployee(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.databaseService.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return new EmployeeResponseDto(employee);
  }

  async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    try {
      const employee = await this.databaseService.employee.update({
        where: { id },
        data: updateEmployeeDto,
      });
      return new EmployeeResponseDto(employee);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }
      throw new BadRequestException('Failed to update employee');
    }
  }

  async removeEmployee(id: string): Promise<{ message: string }> {
    try {
      await this.databaseService.employee.delete({
        where: { id },
      });
      return { message: 'Employee deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }
      throw new BadRequestException('Failed to delete employee');
    }
  }

  async bulkCreateEmployee(bulkCreateEmployeeDto: BulkCreateEmployeeDto): Promise<{ 
    created: number; 
    employees: EmployeeResponseDto[] 
  }> {
    if (!bulkCreateEmployeeDto.employees || !Array.isArray(bulkCreateEmployeeDto.employees)) {
      throw new BadRequestException('Invalid employee data format');
    }

    if (bulkCreateEmployeeDto.employees.length === 0) {
      throw new BadRequestException('Employee array cannot be empty');
    }

    // Validate each employee object
    for (const employee of bulkCreateEmployeeDto.employees) {
      if (!employee.name || !employee.department || !employee.contact) {
        throw new BadRequestException('Each employee must have name, department, and contact');
      }
    }

    try {
      const createdEmployees = await this.databaseService.employee.createMany({
        data: bulkCreateEmployeeDto.employees,
        skipDuplicates: true, // Skip duplicates if any
      });

      // Fetch the created employees to return complete data
      const employees = await this.databaseService.employee.findMany({
        where: {
          name: {
            in: bulkCreateEmployeeDto.employees.map(emp => emp.name)
          }
        },
        orderBy: { createdAt: 'desc' },
        take: createdEmployees.count
      });

      return {
        created: createdEmployees.count,
        employees: employees.map(emp => new EmployeeResponseDto(emp))
      };
    } catch (error) {
      throw new BadRequestException('Failed to bulk create employees');
    }
  }

  // Alternative bulk create method with transaction for better error handling
  async bulkCreateEmployeeWithTransaction(bulkCreateEmployeeDto: BulkCreateEmployeeDto): Promise<{ 
    created: number; 
    employees: EmployeeResponseDto[] 
  }> {
    if (!bulkCreateEmployeeDto.employees || !Array.isArray(bulkCreateEmployeeDto.employees)) {
      throw new BadRequestException('Invalid employee data format');
    }

    try {
      const result = await this.databaseService.$transaction(async (tx) => {
        const createdEmployees = [];
        
        for (const employeeData of bulkCreateEmployeeDto.employees) {
          const employee = await tx.employee.create({
            data: employeeData,
          });
          createdEmployees.push(employee);
        }

        return createdEmployees;
      });

      return {
        created: result.length,
        employees: result.map(emp => new EmployeeResponseDto(emp))
      };
    } catch (error) {
      throw new BadRequestException('Failed to bulk create employees: ' + error.message);
    }
  }

   // Search functionality
  async search(searchDto: SearchEmployeeDto): Promise<SearchResponseDto> {
    const { query, department, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    // Build the where condition for search
    const where: any = {};

    if (query) {
      where.OR = [
        {
          name: {
            contains: query,
            mode: 'insensitive', // Case insensitive search
          },
        },
        {
          contact: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          department: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (department) {
      where.department = {
        contains: department,
        mode: 'insensitive',
      };
    }

    try {
      const [employees, total] = await Promise.all([
        this.databaseService.employee.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.databaseService.employee.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: employees.map(employee => new EmployeeResponseDto(employee)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new BadRequestException('Failed to search employees');
    }
  }

  // Advanced search with multiple filters
  async advancedSearch(filters: {
    name?: string;
    department?: string;
    contact?: string;
    page?: number;
    limit?: number;
  }): Promise<SearchResponseDto> {
    const { name, department, contact, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (department) {
      where.department = {
        contains: department,
        mode: 'insensitive',
      };
    }

    if (contact) {
      where.contact = {
        contains: contact,
        mode: 'insensitive',
      };
    }

    try {
      const [employees, total] = await Promise.all([
        this.databaseService.employee.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.databaseService.employee.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: employees.map(employee => new EmployeeResponseDto(employee)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new BadRequestException('Failed to search employees');
    }
  }

  // Get all unique departments for filter dropdowns
  async getDepartments(): Promise<string[]> {
    try {
      const departments = await this.databaseService.employee.findMany({
        select: {
          department: true,
        },
        distinct: ['department'],
        orderBy: {
          department: 'asc',
        },
      });

      return departments.map(dept => dept.department);
    } catch (error) {
      throw new BadRequestException('Failed to fetch departments');
    }
  }
}
