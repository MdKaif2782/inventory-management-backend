import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto {
  name?: string;
  category?: string;
  purchasePrice?: number;
  salePrice?: number;
  quantity?: number;
  userId: string; // ID of the staff member updating the product
}
