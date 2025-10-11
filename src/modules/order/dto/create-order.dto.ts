// src/orders/dto/create-order.dto.ts
import { OrderType } from '@prisma/client';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsJSON,
  IsNumber,
} from 'class-validator';

export enum DeliveryMethod {
  PICKUP = 'PICKUP',
  HOME_DELIVERY = 'HOME_DELIVERY',
  SERVICE_AT_LOCATION = 'SERVICE_AT_LOCATION',
}

export enum UrgencyLevel {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
}

export class CreateOrderDto {
  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @IsString()
  serviceDescription?: string;

  @IsOptional()
  @IsDateString()
  preferredDateTime?: string;

  @IsOptional()
  @IsString()
  productDetails?: string;

  @IsOptional()
  @IsString()
  customRequest?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsEnum(UrgencyLevel)
  urgency: UrgencyLevel;

  @IsBoolean()
  agreement: boolean;

  @IsOptional()
  idCardData?: any; // JSON array of ID card objects

  @IsOptional()
  @IsString()
  idCardTemplate?: string;

  @IsOptional()
  @IsNumber()
  idCardCount?: number;
  
}
