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

export class CreateSaleDto {
  cashierId: string;
  items: CartItemDto[];
}