// product.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, CreateProductWithStockDto} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InventoryLogType } from '@prisma/client';
import { AccessTokenGuard } from '../auth/auth.guard';
import { Response } from 'express';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

    // New endpoint for stock-aware product creation
  @Post('with-stock-tracking')
  async createWithStockTracking(@Body() createProductDto: CreateProductWithStockDto) {
    return this.productService.createWithStockTracking(createProductDto);
  }

    // Get product details for pre-filling form
  @Get(':id/for-restock')
  async getProductForRestock(@Param('id') id: string) {
    return this.productService.getProductForRestock(id);
  }

    // Search products for UI selection
  @Get('search')
  async searchProducts(@Query('q') searchTerm: string) {
    if (!searchTerm) {
      return [];
    }
    return this.productService.searchProducts(searchTerm);
  }

  // Get product lineage
  @Get(':id/lineage')
  async getProductLineage(@Param('id') id: string) {
    return this.productService.getProductLineage(id);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.productService.findAll(search, category);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productService.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  remove(@Param('id') id: string, @Req() req: Request) {
    const request = req as unknown as { user: { id: string } };
    return this.productService.remove(id, request.user.id);
  }

  @Get('logs/inventory')
  getInventoryLogs(
    @Query('productId') productId?: string,
    @Query('type') type?: InventoryLogType,
    @Query('userId') userId?: string,
  ) {
    return this.productService.getInventoryLogs(productId, type, userId);
  }
}