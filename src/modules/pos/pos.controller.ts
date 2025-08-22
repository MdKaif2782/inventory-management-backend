// pos.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {  PosService } from './pos.service';
import { CreateSaleDto, AddToCartDto, SearchProductsDto } from './dto';

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('products/search')
  searchProducts(@Query() searchParams: SearchProductsDto) {
    return this.posService.searchProducts(searchParams);
  }

  @Get('products/barcode/:barcode')
  getProductByBarcode(@Param('barcode') barcode: string) {
    return this.posService.getProductByBarcode(barcode);
  }

  @Post('cart/add')
  async addToCart(@Body() addToCartDto: AddToCartDto) {
    return await this.posService.addToCart(addToCartDto);
  }

  @Post('cart/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@Body('cashierId') cashierId: string) {
    return await this.posService.clearCart(cashierId);
  }

  @Post('checkout')
  async checkout(@Body() createSaleDto: CreateSaleDto) {
    return await this.posService.checkout(createSaleDto);
  }

  @Get('cart/:cashierId')
  async getCart(@Param('cashierId') cashierId: string) {
    return await this.posService.getCart(cashierId);
  }
}