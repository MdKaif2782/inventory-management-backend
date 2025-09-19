// complete-order.dto.ts
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderProductItemDto {
  @IsOptional()
  @IsString()
  productId?: string; // If exists, use existing product

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsNumber()
  @Min(0)
  quantity: number; // Quantity sold
}

export class OrderServiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  charge: number;
}

export class CompleteOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductItemDto)
  products: OrderProductItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderServiceItemDto)
  services: OrderServiceItemDto[];

  @IsString()
  @IsNotEmpty()
  staffId: string; // ID of staff completing the order
}