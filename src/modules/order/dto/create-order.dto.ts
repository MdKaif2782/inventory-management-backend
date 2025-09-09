// src/orders/dto/create-order.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export enum OrderType {
  SERVICE = 'SERVICE',
  PRODUCT_PURCHASE = 'PRODUCT_PURCHASE',
  CUSTOM_REQUEST = 'CUSTOM_REQUEST',
}

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
}
