import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateStaffDto, UpdateStaffDto, ChangePasswordDto, SearchStaffDto} from './dto';
import { hash, verify } from 'argon2';
import { StaffRole, StaffStatus } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private databaseService: DatabaseService) {}

  async generateStaffId(): Promise<string> {
    // Count existing staff to generate sequential ID
    const staffCount = await this.databaseService.staff.count();
    return `STF${(staffCount + 1).toString().padStart(3, '0')}`;
  }

  async create(createStaffDto: CreateStaffDto) {
    // Generate staff ID
    const staffId = await this.generateStaffId();
    
    // Check if username already exists
    const existingUsername = await this.databaseService.staff.findUnique({
      where: { username: createStaffDto.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await this.databaseService.staff.findUnique({
      where: { email: createStaffDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await hash(createStaffDto.password);

    try {
      const staff = await this.databaseService.staff.create({
        data: {
          staffId,
          fullName: createStaffDto.fullName,
          username: createStaffDto.username,
          email: createStaffDto.email,
          phone: createStaffDto.phone,
          password: hashedPassword,
          role: createStaffDto.role || StaffRole.STAFF,
          status: StaffStatus.ACTIVE,
        },
        select: {
          id: true,
          staffId: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      return staff;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Staff with this username or email already exists');
      }
      throw error;
    }
  }

  async findAll(searchParams: SearchStaffDto) {
    const { query, status, role } = searchParams;
    const where: any = {};

    if (query) {
      where.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { username: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { staffId: { contains: query } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    return this.databaseService.staff.findMany({
      where,
      select: {
        id: true,
        staffId: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const total = await this.databaseService.staff.count();
    const active = await this.databaseService.staff.count({
      where: { status: StaffStatus.ACTIVE },
    });
    const inactive = await this.databaseService.staff.count({
      where: { status: StaffStatus.INACTIVE },
    });

    return {
      total,
      active,
      inactive,
    };
  }

  async findOne(id: string) {
    const staff = await this.databaseService.staff.findUnique({
      where: { id },
      select: {
        id: true,
        staffId: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return staff;
  }

  async findByStaffId(staffId: string) {
    const staff = await this.databaseService.staff.findUnique({
      where: { staffId },
      select: {
        id: true,
        staffId: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${staffId} not found`);
    }

    return staff;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    try {
      // Check if username already exists (if being updated)
      if (updateStaffDto.username) {
        const existingUsername = await this.databaseService.staff.findFirst({
          where: {
            username: updateStaffDto.username,
            NOT: { id },
          },
        });

        if (existingUsername) {
          throw new ConflictException('Username already exists');
        }
      }

      // Check if email already exists (if being updated)
      if (updateStaffDto.email) {
        const existingEmail = await this.databaseService.staff.findFirst({
          where: {
            email: updateStaffDto.email,
            NOT: { id },
          },
        });

        if (existingEmail) {
          throw new ConflictException('Email already registered');
        }
      }

      const staff = await this.databaseService.staff.update({
        where: { id },
        data: updateStaffDto,
        select: {
          id: true,
          staffId: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      return staff;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Staff with ID ${id} not found`);
      }
      throw error;
    }
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto) {
    const staff = await this.databaseService.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    // Verify current password
    const isCurrentPasswordCorrect = await verify(
      staff.password,
      changePasswordDto.currentPassword,
    );

    if (!isCurrentPasswordCorrect) {
      throw new ForbiddenException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hash(changePasswordDto.newPassword);

    await this.databaseService.staff.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async activate(id: string) {
    try {
      const staff = await this.databaseService.staff.update({
        where: { id },
        data: { status: StaffStatus.ACTIVE },
        select: {
          id: true,
          staffId: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      return staff;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Staff with ID ${id} not found`);
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    try {
      const staff = await this.databaseService.staff.update({
        where: { id },
        data: { status: StaffStatus.INACTIVE },
        select: {
          id: true,
          staffId: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      return staff;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Staff with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      // Check if staff has any related records before deleting
      const hasSales = await this.databaseService.sale.count({
        where: { cashierId: id },
      });

      const hasInventoryLogs = await this.databaseService.inventoryLog.count({
        where: { userId: id },
      });

      if (hasSales > 0 || hasInventoryLogs > 0) {
        throw new BadRequestException(
          'Cannot delete staff member with associated records. Deactivate instead.',
        );
      }

      await this.databaseService.staff.delete({
        where: { id },
      });

      return { message: 'Staff member deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Staff with ID ${id} not found`);
      }
      throw error;
    }
  }
}