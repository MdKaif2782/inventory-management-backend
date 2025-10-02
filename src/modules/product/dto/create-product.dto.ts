// dto/index.ts
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
export class CreateProductDto {
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  userId: string;
}

export class CreateProductWithStockDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsNumber()
  purchasePrice: number;

  @IsNumber()
  salePrice: number;

  @IsNumber()
  quantity: number;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  previousProductId?: string; // ID of the product to restock
}

