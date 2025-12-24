// dto/index.ts
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsEmail, 
  Min, 
  ValidateNested, 
  IsNotEmpty,
  IsArray,
  IsInt,
  IsPositive,
  IsEnum,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeStatus, SalaryPaymentStatus } from '@prisma/client';

// ================= EMPLOYEE DTOs =================

export class SalaryBreakdownDto {
  @IsNumber()
  @Min(0)
  medical: number;

  @IsNumber()
  @Min(0)
  tada: number;

  @IsNumber()
  @Min(0)
  mobile: number;

  @IsNumber()
  @Min(0)
  others: number;

  constructor(data?: Partial<SalaryBreakdownDto>) {
    if (data) {
      this.medical = data.medical ?? 0;
      this.tada = data.tada ?? 0;
      this.mobile = data.mobile ?? 0;
      this.others = data.others ?? 0;
    }
  }
}

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsOptional()
  @IsEmail()
  email?: string;
  
  @IsNumber()
  @Min(0)
  totalSalary: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advanceBalance?: number;
  
  @ValidateNested()
  @Type(() => SalaryBreakdownDto)
  salaryBreakdown: SalaryBreakdownDto;

  constructor(data?: Partial<CreateEmployeeDto>) {
    if (data) {
      this.name = data.name || '';
      this.employeeId = data.employeeId || '';
      this.designation = data.designation || '';
      this.department = data.department || '';
      this.contact = data.contact || '';
      this.email = data.email || '';
      this.totalSalary = data.totalSalary || 0;
      this.advanceBalance = data.advanceBalance || 0;
      this.salaryBreakdown = new SalaryBreakdownDto(data.salaryBreakdown);
    }
  }
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalSalary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advanceBalance?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalaryBreakdownDto)
  salaryBreakdown?: SalaryBreakdownDto;

  constructor(data?: Partial<UpdateEmployeeDto>) {
    if (data) {
      Object.assign(this, data);
      if (data.salaryBreakdown) {
        this.salaryBreakdown = new SalaryBreakdownDto(data.salaryBreakdown);
      }
    }
  }
}

// ================= SALARY DTOs =================

export class DeductionsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  advanceBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  excessMoney?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  others?: number;

  constructor(data?: Partial<DeductionsDto>) {
    if (data) {
      this.advanceBalance = data.advanceBalance ?? 0;
      this.excessMoney = data.excessMoney ?? 0;
      this.others = data.others ?? 0;
    }
  }
}

export class EmployeeSalaryDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  festivalBonus?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeductionsDto)
  deductions?: DeductionsDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidInCash?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidInBank?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  constructor(data?: Partial<EmployeeSalaryDto>) {
    if (data) {
      this.employeeId = data.employeeId || '';
      this.overtimeHours = data.overtimeHours ?? 0;
      this.festivalBonus = data.festivalBonus ?? 0;
      this.deductions = data.deductions ? new DeductionsDto(data.deductions) : new DeductionsDto();
      this.paidInCash = data.paidInCash ?? 0;
      this.paidInBank = data.paidInBank ?? 0;
      this.remarks = data.remarks || '';
    }
  }
}

export class BulkSalaryProcessDto {
  @IsString()
  @IsNotEmpty()
  month: string;

  @IsNumber()
  @IsInt()
  @IsPositive()
  year: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeSalaryDto)
  payments: EmployeeSalaryDto[];

  @IsString()
  @IsNotEmpty()
  processedById: string;

  constructor(data?: Partial<BulkSalaryProcessDto>) {
    if (data) {
      this.month = data.month || '';
      this.year = data.year || new Date().getFullYear();
      this.payments = data.payments?.map(p => new EmployeeSalaryDto(p)) || [];
      this.processedById = data.processedById || '';
    }
  }
}

// Response DTOs (no validation needed for responses, just types)
export class SalaryPaymentDto {
  paymentNumber: string;
  employeeId: string;
  month: string;
  year: number;
  runningMonthSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  festivalBonus: number;
  deductions: DeductionsDto;
  totalDeductions: number;
  totalSalary: number;
  finalPayable: number;
  paidInCash: number;
  paidInBank: number;
  status: string;
  remarks?: string;
  processedById?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data?: Partial<SalaryPaymentDto>) {
    if (data) {
      Object.assign(this, data);
      if (data.deductions) {
        this.deductions = new DeductionsDto(data.deductions);
      }
    }
  }
}

export class UpdateSalaryPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  festivalBonus?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeductionsDto)
  deductions?: DeductionsDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidInCash?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidInBank?: number;

  @IsOptional()
  @IsEnum(SalaryPaymentStatus)
  status?: SalaryPaymentStatus;

  @IsOptional()
  @IsString()
  remarks?: string;

  constructor(data?: Partial<UpdateSalaryPaymentDto>) {
    if (data) {
      Object.assign(this, data);
      if (data.deductions) {
        this.deductions = new DeductionsDto(data.deductions);
      }
    }
  }
}

export class MonthYearDto {
  @IsString()
  @IsNotEmpty()
  month: string;

  @IsNumber()
  @IsInt()
  @IsPositive()
  year: number;

  constructor(data?: Partial<MonthYearDto>) {
    if (data) {
      this.month = data.month || '';
      this.year = data.year || new Date().getFullYear();
    }
  }
}

export class SalaryReportDto {
  month: string;
  year: number;
  totalSalaryPaid: number;
  totalCash: number;
  totalBank: number;
  totalEmployees: number;
  payments: SalaryPaymentDto[];

  constructor(data?: Partial<SalaryReportDto>) {
    if (data) {
      this.month = data.month || '';
      this.year = data.year || new Date().getFullYear();
      this.totalSalaryPaid = data.totalSalaryPaid || 0;
      this.totalCash = data.totalCash || 0;
      this.totalBank = data.totalBank || 0;
      this.totalEmployees = data.totalEmployees || 0;
      this.payments = data.payments?.map(p => new SalaryPaymentDto(p)) || [];
    }
  }
}

// ================= QUERY DTOs =================

export class EmployeeQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  constructor(data?: Partial<EmployeeQueryDto>) {
    if (data) {
      Object.assign(this, data);
      this.page = data.page || 1;
      this.limit = data.limit || 20;
      this.includeInactive = data.includeInactive || false;
    }
  }
}

export class SalaryQueryDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsEnum(SalaryPaymentStatus)
  status?: SalaryPaymentStatus;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  limit?: number;

  constructor(data?: Partial<SalaryQueryDto>) {
    if (data) {
      Object.assign(this, data);
      this.page = data.page || 1;
      this.limit = data.limit || 20;
      this.year = data.year || new Date().getFullYear();
    }
  }
}
