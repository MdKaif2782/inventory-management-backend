import { Employee } from '@prisma/client';
import { SalaryBreakdownDto, DeductionsDto } from '../dto';

export class SalaryBreakdown implements SalaryBreakdownDto {
  medical: number;
  tada: number;
  mobile: number;
  others: number;

  constructor(data: any) {
    this.medical = data?.medical || 0;
    this.tada = data?.tada || 0;
    this.mobile = data?.mobile || 0;
    this.others = data?.others || 0;
  }

  validate(totalSalary: number): void {
    const total = this.medical + this.tada + this.mobile + this.others;
    const twentyThreePercent = totalSalary * 0.23;
    
    // Allow 0.01 tolerance for floating point errors
    if (Math.abs(total - twentyThreePercent) > 0.01) {
      throw new Error(
        `Total breakdown (${total}) must equal 23% of total salary (${twentyThreePercent})`
      );
    }
  }

  static createFromTotal(totalSalary: number): SalaryBreakdown {
    const twentyThreePercent = totalSalary * 0.23;
    return new SalaryBreakdown({
      medical: 0,
      tada: 0,
      mobile: 0,
      others: twentyThreePercent
    });
  }

  toJSON(): SalaryBreakdownDto {
    return {
      medical: this.medical,
      tada: this.tada,
      mobile: this.mobile,
      others: this.others
    };
  }
}

export class SalaryCalculation {
  private employee: Employee;
  private overtimeHours: number;
  private festivalBonus: number;
  private deductions: DeductionsDto;

  constructor(
    employee: Employee,
    overtimeHours: number = 0,
    festivalBonus: number = 0,
    deductions: DeductionsDto = { advanceBalance: 0, excessMoney: 0, others: 0 }
  ) {
    this.employee = employee;
    this.overtimeHours = overtimeHours;
    this.festivalBonus = festivalBonus;
    this.deductions = deductions;
  }

  calculate(): {
    runningMonthSalary: number;
    overtimeAmount: number;
    festivalBonus: number;
    totalSalary: number;
    deductions: DeductionsDto;
    totalDeductions: number;
    finalPayable: number;
  } {
    // Calculate hourly rate (assuming 26 working days in month, 8 hours per day)
    const dailySalary = this.employee.totalSalary / 26;
    const hourlyRate = dailySalary / 8;
    
    // Base salary for the month
    const runningMonthSalary = this.employee.totalSalary;
    
    // Overtime calculation
    const overtimeAmount = this.overtimeHours * hourlyRate;
    
    // Festival bonus
    const festivalBonus = this.festivalBonus;
    
    // Total salary components
    const totalSalary = runningMonthSalary + overtimeAmount + festivalBonus;
    
    // Total deductions
    const totalDeductions = 
      (this.deductions.advanceBalance || 0) +
      (this.deductions.excessMoney || 0) +
      (this.deductions.others || 0);
    
    // Final payable amount
    const finalPayable = totalSalary - totalDeductions;

    return {
      runningMonthSalary,
      overtimeAmount,
      festivalBonus,
      totalSalary,
      deductions: this.deductions,
      totalDeductions,
      finalPayable
    };
  }

  validate(): void {
    // Validate salary breakdown
    const breakdown = new SalaryBreakdown(this.employee.salaryBreakdown as any);
    breakdown.validate(this.employee.totalSalary);
    
    // Validate deductions don't exceed total salary
    const { totalSalary, totalDeductions } = this.calculate();
    if (totalDeductions > totalSalary) {
      throw new Error('Total deductions cannot exceed total salary');
    }
    
    // Validate advance balance deduction doesn't exceed available balance
    if (this.deductions.advanceBalance > this.employee.advanceBalance) {
      throw new Error('Advance balance deduction exceeds available balance');
    }
  }
}