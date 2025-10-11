// src/orders/dto/order-query.dto.ts
import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from './update-order.dto';
import { OrderType } from '@prisma/client';

export class OrderQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}