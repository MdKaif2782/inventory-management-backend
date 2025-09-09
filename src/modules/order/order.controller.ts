// src/orders/orders.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  Res,
  NotFoundException,
  UseInterceptors,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './order.service';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { Response } from 'express';
import mime from 'mime';
import { FileInterceptor } from "@nestjs/platform-express";
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Post("file")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return await this.ordersService.uploadFile(file);
  }

  @Get("file/:id/:filename")
  async getFile(
    @Param("id") id: string,
    @Param("filename") filename: string,
    @Res() res: Response
  ) {
    try {
      const { base64, filename: storedFilename } =
        await this.ordersService.getFileById(parseInt(id));
      if (filename !== storedFilename) {
        throw new NotFoundException("Invalid filename");
      }

      const mimeType = "application/octet-stream";
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${storedFilename}"`);

      res.send(Buffer.from(base64, "base64"));
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  }

  @Get()
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllOrders(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOneOrder(+id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(+id, updateOrderStatusDto);
  }
}
