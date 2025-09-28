
export class CreateEmployeeDto {
  name: string;
  department: string;
  contact: string;
}

export class UpdateEmployeeDto {
  name?: string;
  department?: string;
  contact?: string;
}

export class BulkCreateEmployeeDto {
  employees: CreateEmployeeDto[];
}

export class EmployeeResponseDto {
  id: string;
  name: string;
  department: string;
  contact: string;

  constructor(employee: any) {
    this.id = employee.id;
    this.name = employee.name;
    this.department = employee.department;
    this.contact = employee.contact;
  }
}

export class SearchEmployeeDto {
  query?: string;
  department?: string;
  page?: number = 1;
  limit?: number = 10;
}

export class SearchResponseDto {
  data: EmployeeResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}