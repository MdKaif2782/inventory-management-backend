import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  BulkSalaryProcessDto,
  SalaryPaymentDto,
  UpdateSalaryPaymentDto,
  MonthYearDto,
  SalaryReportDto,
  SalaryBreakdownDto,
  DeductionsDto,
} from './dto';
import { SalaryCalculation, SalaryBreakdown } from './entities/salary.entity';
import { EmployeeStatus, SalaryPaymentStatus, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

// Helper functions for JSON type conversions
const toPrismaJson = <T>(data: T): Prisma.JsonValue => {
  return data as unknown as Prisma.JsonValue;
};

const fromPrismaJson = <T>(json: Prisma.JsonValue | null): T => {
  if (json === null) return {} as T;
  return json as unknown as T;
};

const assertString = (value: any): string => {
  if (typeof value !== 'string') {
    throw new BadRequestException('Expected string value');
  }
  return value;
};

@Injectable()
export class SalaryService {
  constructor(private prisma: DatabaseService) {}

  // ================= EMPLOYEE MANAGEMENT =================

  async createEmployee(createEmployeeDto: CreateEmployeeDto) {
    const { salaryBreakdown, totalSalary, ...employeeData } = createEmployeeDto;

    // Validate salary breakdown equals 23% of total salary
    const breakdown = new SalaryBreakdown(salaryBreakdown);
    breakdown.validate(totalSalary);

    // Check if employeeId already exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { employeeId: employeeData.employeeId },
    });

    if (existingEmployee) {
      throw new ConflictException(`Employee with ID ${employeeData.employeeId} already exists`);
    }

    // Check if email exists (if provided)
    if (employeeData.email) {
      const existingEmail = await this.prisma.employee.findUnique({
        where: { email: employeeData.email },
      });

      if (existingEmail) {
        throw new ConflictException(`Employee with email ${employeeData.email} already exists`);
      }
    }

    // Create employee with salary structure
    return this.prisma.employee.create({
      data: {
        ...employeeData,
        totalSalary,
        advanceBalance: createEmployeeDto.advanceBalance || 0,
        salaryBreakdown: toPrismaJson(salaryBreakdown),
        leaveGranted: 4, // Fixed 4 days leave per month
        status: EmployeeStatus.ACTIVE,
      },
    });
  }

  async getAllEmployees(includeInactive: boolean = false) {
    const where: Prisma.EmployeeWhereInput = includeInactive ? {} : { status: EmployeeStatus.ACTIVE };
    
    return this.prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        salaryPayments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            month: true,
            year: true,
            finalPayable: true,
            status: true,
          },
        },
      },
    });
  }

  async getEmployeeById(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        salaryPayments: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
          ],
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Prepare update data
    const updateData: Prisma.EmployeeUpdateInput = {};

    // Copy simple fields
    if (updateEmployeeDto.name !== undefined) updateData.name = updateEmployeeDto.name;
    if (updateEmployeeDto.designation !== undefined) updateData.designation = updateEmployeeDto.designation;
    if (updateEmployeeDto.department !== undefined) updateData.department = updateEmployeeDto.department;
    if (updateEmployeeDto.contact !== undefined) updateData.contact = updateEmployeeDto.contact;
    if (updateEmployeeDto.email !== undefined) updateData.email = updateEmployeeDto.email;
    if (updateEmployeeDto.status !== undefined) updateData.status = updateEmployeeDto.status as EmployeeStatus;
    if (updateEmployeeDto.totalSalary !== undefined) updateData.totalSalary = updateEmployeeDto.totalSalary;
    if (updateEmployeeDto.advanceBalance !== undefined) updateData.advanceBalance = updateEmployeeDto.advanceBalance;

    // If totalSalary or salaryBreakdown is being updated, validate
    if (updateEmployeeDto.totalSalary !== undefined || updateEmployeeDto.salaryBreakdown !== undefined) {
      const totalSalary = updateEmployeeDto.totalSalary ?? employee.totalSalary;
      const salaryBreakdown = updateEmployeeDto.salaryBreakdown ?? fromPrismaJson<SalaryBreakdownDto>(employee.salaryBreakdown);
      
      const breakdown = new SalaryBreakdown(salaryBreakdown);
      breakdown.validate(totalSalary);
      
      if (updateEmployeeDto.salaryBreakdown !== undefined) {
        updateData.salaryBreakdown = toPrismaJson(updateEmployeeDto.salaryBreakdown);
      }
    }

    // Check for unique constraints
    if (updateEmployeeDto.employeeId !== undefined) {
      const employeeIdStr = assertString(updateEmployeeDto.employeeId);
      if (employeeIdStr !== employee.employeeId) {
        const existingEmployee = await this.prisma.employee.findUnique({
          where: { employeeId: employeeIdStr },
        });

        if (existingEmployee) {
          throw new ConflictException(`Employee with ID ${employeeIdStr} already exists`);
        }
        updateData.employeeId = employeeIdStr;
      }
    }

    if (updateEmployeeDto.email !== undefined && updateEmployeeDto.email !== employee.email) {
      const existingEmail = await this.prisma.employee.findUnique({
        where: { email: updateEmployeeDto.email },
      });

      if (existingEmail) {
        throw new ConflictException(`Employee with email ${updateEmployeeDto.email} already exists`);
      }
    }

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteEmployee(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Check if employee has salary payments
    const salaryPayments = await this.prisma.salaryPayment.findMany({
      where: { employeeId: id },
    });

    if (salaryPayments.length > 0) {
      throw new BadRequestException('Cannot delete employee with existing salary payments');
    }

    return this.prisma.employee.delete({
      where: { id },
    });
  }

  // ================= SALARY PROCESSING =================

  private generatePaymentNumber(year: number, month: string): string {
    const monthNumber = this.getMonthNumber(month);
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SAL-${year}-${monthNumber}-${randomPart}`;
  }

  private getMonthNumber(month: string): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const index = months.findIndex(m => m.toLowerCase() === month.toLowerCase());
    if (index === -1) {
      throw new BadRequestException(`Invalid month: ${month}`);
    }
    return (index + 1).toString().padStart(2, '0');
  }

  async processSalary(bulkDto: BulkSalaryProcessDto) {
    const { month, year, payments, processedById } = bulkDto;

    // Validate staff exists
    const staff = await this.prisma.staff.findUnique({
      where: { id: processedById },
    });
    if (!staff) {
      throw new NotFoundException(`Staff with ID ${processedById} not found`);
    }

    // Start a transaction for atomic operations
    return this.prisma.$transaction(async (prisma) => {
      const results = [];
      const errors = [];

      for (const payment of payments) {
        try {
          // Get employee
          const employee = await prisma.employee.findUnique({
            where: { id: payment.employeeId },
          });

          if (!employee) {
            throw new Error(`Employee not found`);
          }

          if (employee.status !== EmployeeStatus.ACTIVE) {
            throw new Error(`Employee is not active`);
          }

          // Check for duplicate payment
          const existingPayment = await prisma.salaryPayment.findUnique({
            where: {
              employeeId_month_year: {
                employeeId: employee.id,
                month,
                year,
              },
            },
          });

          if (existingPayment) {
            throw new Error(`Salary already processed for this month`);
          }

          // Create calculation instance
          const calculation = new SalaryCalculation(
            employee,
            payment.overtimeHours || 0,
            payment.festivalBonus || 0,
            payment.deductions || { advanceBalance: 0, excessMoney: 0, others: 0 }
          );

          // Validate salary structure and deductions
          calculation.validate();

          // Calculate salary
          const calculated = calculation.calculate();

          // Validate payment split
          const paidInCash = payment.paidInCash || 0;
          const paidInBank = payment.paidInBank || 0;
          const totalPaid = paidInCash + paidInBank;
          
          if (Math.abs(totalPaid - calculated.finalPayable) > 0.01) {
            throw new Error(
              `Payment split (${totalPaid}) must equal final payable amount (${calculated.finalPayable})`
            );
          }

          // Determine payment status
          let status: SalaryPaymentStatus = SalaryPaymentStatus.PAID;
          if (totalPaid < calculated.finalPayable) {
            status = SalaryPaymentStatus.PARTIALLY_PAID;
          }

          // Create payment record
          const salaryPayment = await prisma.salaryPayment.create({
            data: {
              paymentNumber: this.generatePaymentNumber(year, month),
              employeeId: employee.id,
              month,
              year,
              runningMonthSalary: calculated.runningMonthSalary,
              overtimeHours: payment.overtimeHours || 0,
              overtimeAmount: calculated.overtimeAmount,
              festivalBonus: calculated.festivalBonus,
              deductions: toPrismaJson(payment.deductions || {}),
              totalDeductions: calculated.totalDeductions,
              totalSalary: calculated.totalSalary,
              finalPayable: calculated.finalPayable,
              paidInCash,
              paidInBank,
              status,
              remarks: payment.remarks,
              processedById,
            },
          });

          // Update employee's advance balance if advance was deducted
          if (payment.deductions?.advanceBalance) {
            await prisma.employee.update({
              where: { id: employee.id },
              data: {
                advanceBalance: Math.max(0, employee.advanceBalance - payment.deductions.advanceBalance),
              },
            });
          }

          results.push(salaryPayment);
        } catch (error) {
          errors.push({
            employeeId: payment.employeeId,
            error: (error as Error).message,
          });
        }
      }

      // If any errors occurred, throw to rollback transaction
      if (errors.length > 0) {
        throw new BadRequestException({
          message: 'Some salary payments failed',
          success: results.length,
          failed: errors.length,
          errors,
        });
      }

      return {
        success: results.length,
        failed: 0,
        results,
      };
    });
  }

  async getSalaryPayments(monthYear?: MonthYearDto) {
    const where: Prisma.SalaryPaymentWhereInput = {};
    
    if (monthYear) {
      where.month = monthYear.month;
      where.year = monthYear.year;
    }

    const payments = await this.prisma.salaryPayment.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            designation: true,
            department: true,
          },
        },
        processedBy: {
          select: {
            id: true,
            fullName: true,
            staffId: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return payments.map(payment => ({
      ...payment,
      deductions: fromPrismaJson<DeductionsDto>(payment.deductions),
    }));
  }

  async getSalaryPayment(id: string) {
    const payment = await this.prisma.salaryPayment.findUnique({
      where: { id },
      include: {
        employee: true,
        processedBy: {
          select: {
            id: true,
            fullName: true,
            staffId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Salary payment with ID ${id} not found`);
    }

    return {
      ...payment,
      deductions: fromPrismaJson<DeductionsDto>(payment.deductions),
    };
  }

  async updateSalaryPayment(id: string, updateDto: UpdateSalaryPaymentDto) {
    const payment = await this.prisma.salaryPayment.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!payment) {
      throw new NotFoundException(`Salary payment with ID ${id} not found`);
    }

    // Start transaction for atomic update
    return this.prisma.$transaction(async (prisma) => {
      // Restore previous advance balance if changed
      if (updateDto.deductions?.advanceBalance !== undefined) {
        const oldDeductions = fromPrismaJson<DeductionsDto>(payment.deductions);
        const advanceDifference = updateDto.deductions.advanceBalance - (oldDeductions?.advanceBalance || 0);
        
        if (advanceDifference !== 0) {
          await prisma.employee.update({
            where: { id: payment.employeeId },
            data: {
              advanceBalance: Math.max(0, payment.employee.advanceBalance - advanceDifference),
            },
          });
        }
      }

      // Prepare update data
      const updateData: Prisma.SalaryPaymentUpdateInput = {};

      // Handle deductions update
      if (updateDto.deductions !== undefined) {
        updateData.deductions = toPrismaJson(updateDto.deductions);
      }

      // Handle other fields
      if (updateDto.paidInCash !== undefined) updateData.paidInCash = updateDto.paidInCash;
      if (updateDto.paidInBank !== undefined) updateData.paidInBank = updateDto.paidInBank;
      if (updateDto.status !== undefined) updateData.status = updateDto.status as SalaryPaymentStatus;
      if (updateDto.remarks !== undefined) updateData.remarks = updateDto.remarks;

      // Recalculate if overtime or festival bonus changed
      if (updateDto.overtimeHours !== undefined || updateDto.festivalBonus !== undefined) {
        const currentDeductions = updateDto.deductions 
          ? { ...fromPrismaJson<DeductionsDto>(payment.deductions), ...updateDto.deductions }
          : fromPrismaJson<DeductionsDto>(payment.deductions);

        const calculation = new SalaryCalculation(
          payment.employee,
          updateDto.overtimeHours ?? payment.overtimeHours,
          updateDto.festivalBonus ?? payment.festivalBonus,
          currentDeductions
        );

        calculation.validate();
        const calculated = calculation.calculate();

        // Update with recalculated values
        updateData.overtimeHours = updateDto.overtimeHours ?? payment.overtimeHours;
        updateData.overtimeAmount = calculated.overtimeAmount;
        updateData.festivalBonus = calculated.festivalBonus;
        updateData.totalDeductions = calculated.totalDeductions;
        updateData.totalSalary = calculated.totalSalary;
        updateData.finalPayable = calculated.finalPayable;
      }

      const updatedPayment = await prisma.salaryPayment.update({
        where: { id },
        data: updateData,
      });

      return {
        ...updatedPayment,
        deductions: fromPrismaJson<DeductionsDto>(updatedPayment.deductions),
      };
    });
  }

  async deleteSalaryPayment(id: string) {
    const payment = await this.prisma.salaryPayment.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!payment) {
      throw new NotFoundException(`Salary payment with ID ${id} not found`);
    }

    // Restore advance balance if deducted
    const deductions = fromPrismaJson<DeductionsDto>(payment.deductions);
    if (deductions?.advanceBalance) {
      await this.prisma.employee.update({
        where: { id: payment.employeeId },
        data: {
          advanceBalance: payment.employee.advanceBalance + deductions.advanceBalance,
        },
      });
    }

    return this.prisma.salaryPayment.delete({
      where: { id },
    });
  }

  async getSalaryReport(month: string, year: number): Promise<SalaryReportDto> {
    const payments = await this.prisma.salaryPayment.findMany({
      where: { month, year },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            designation: true,
          },
        },
      },
    });

    const totalSalaryPaid = payments.reduce((sum, p) => sum + p.finalPayable, 0);
    const totalCash = payments.reduce((sum, p) => sum + p.paidInCash, 0);
    const totalBank = payments.reduce((sum, p) => sum + p.paidInBank, 0);

    return {
      month,
      year,
      totalSalaryPaid,
      totalCash,
      totalBank,
      totalEmployees: payments.length,
      payments: payments.map(p => ({
        ...p,
        deductions: fromPrismaJson<DeductionsDto>(p.deductions),
        employee: p.employee,
      })),
    };
  }

  async getUnpaidEmployees(month: string, year: number) {
    // Find employees who haven't been paid for the given month/year
    const paidEmployees = await this.prisma.salaryPayment.findMany({
      where: { month, year },
      select: { employeeId: true },
    });

    const paidEmployeeIds = paidEmployees.map(p => p.employeeId);

    const employees = await this.prisma.employee.findMany({
      where: {
        id: { notIn: paidEmployeeIds },
        status: EmployeeStatus.ACTIVE,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        designation: true,
        department: true,
        totalSalary: true,
        advanceBalance: true,
        salaryBreakdown: true,
      },
    });

    return employees.map(employee => ({
      ...employee,
      salaryBreakdown: fromPrismaJson<SalaryBreakdownDto>(employee.salaryBreakdown),
    }));
  }

  async getEmployeePaymentHistory(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const payments = await this.prisma.salaryPayment.findMany({
      where: { employeeId },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return payments.map(payment => ({
      ...payment,
      deductions: fromPrismaJson<DeductionsDto>(payment.deductions),
    }));
  }
}