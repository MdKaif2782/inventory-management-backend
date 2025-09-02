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
import { CreateProductDto} from './dto/create-product.dto';
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