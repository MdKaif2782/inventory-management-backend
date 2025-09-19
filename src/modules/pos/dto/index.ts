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