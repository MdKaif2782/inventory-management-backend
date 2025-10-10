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
import { CreateSaleDto, AddToCartDto, SearchProductsDto, CreateBulkSaleDto } from './dto';

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

  @Post('bulk-sale')
  async createBulkSale(@Body() createBulkSaleDto: CreateBulkSaleDto) {
    return this.posService.createBulkSale(createBulkSaleDto);
  }

  @Get('bulk-sales')
  async getBulkSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('companyName') companyName?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    const filters: any = {};
    
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (companyName) filters.companyName = companyName;
    if (cashierId) filters.cashierId = cashierId;

    return this.posService.getBulkSales(filters);
  }

  @Get('bulk-sales/:id')
  async getBulkSale(@Param('id') id: string) {
    return this.posService.getBulkSaleById(id);
  }

  @Get('bulk-sales/stats/overview')
  async getBulkSaleStats() {
    return this.posService.getBulkSaleStats();
  }
}