import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsArray, ValidateNested, Min, IsOptional } from "class-validator";

// dto/index.ts
export class SearchProductsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  quantity: number;
}

export class CartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  barcode: string;

  @IsString()
  category: string;
}

// New DTOs for enhanced POS functionality
export class ServiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  charge: number;
}

export class AdditionalProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  barcode?: string; // Optional, will be auto-generated if not provided

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateSaleDto {
  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services?: ServiceItemDto[]; // Optional for backward compatibility

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalProductDto)
  additionalProducts?: AdditionalProductDto[]; // Optional for backward compatibility
}

export class AddServiceToCartDto {
  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  charge: number;
}

export class AddAdditionalProductToCartDto {
  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsNumber()
  @IsPositive()
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