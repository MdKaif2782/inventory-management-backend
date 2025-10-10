import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsArray, ValidateNested, Min, IsOptional } from "class-validator";

// dto/index.ts
export class SearchProductsDto {
  query?: string;
  category?: string;
}

export class AddToCartDto {
  cashierId: string;
  productId: string;
  quantity: number;
}

export class CartItemDto {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  barcode: string;
  category: string;
}

// New DTOs for enhanced POS functionality
export class ServiceItemDto {
  description: string;
  charge: number;
}

export class AdditionalProductDto {
  name: string;
  category: string;
  barcode?: string; // Optional, will be auto-generated if not provided
  purchasePrice: number;
  salePrice: number;
  quantity: number;
}

export class CreateSaleDto {
  cashierId: string;
  items: CartItemDto[];
  services?: ServiceItemDto[]; // Optional for backward compatibility
  additionalProducts?: AdditionalProductDto[]; // Optional for backward compatibility
}

export class AddServiceToCartDto {
  cashierId: string;
  description: string;
  charge: number;
}

export class AddAdditionalProductToCartDto {
  cashierId: string;
  name: string;
  category: string;
  barcode?: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
}

// create-bulk-sale.dto.ts
// create-bulk-sale.dto.ts
export class CreateBulkSaleDto {
  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSaleItemDto)
  items: BulkSaleItemDto[];

  @IsNumber()
  @Min(0)
  discountAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkSaleItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
}