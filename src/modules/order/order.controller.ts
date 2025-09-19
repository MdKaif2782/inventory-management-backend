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
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './order.service';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { Response } from 'express';
import mime from 'mime';
import { FileInterceptor } from "@nestjs/platform-express";
import { CompleteOrderDto } from './dto/complete-order.dto';
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Post(':id/complete')
  async completeOrder(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() completeOrderDto: CompleteOrderDto
  ) {
    try {
      const result = await this.ordersService.completeOrder(orderId, completeOrderDto);
      
      return {
        success: true,
        message: 'Order completed successfully',
        data: result,
        statusCode: HttpStatus.OK
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to complete order',
          statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/preview-completion')
  async previewOrderCompletion(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() completeOrderDto: CompleteOrderDto
  ) {
    try {
      // Calculate preview without saving
      let totalRevenue = 0;
      let totalCost = 0;
      let serviceIncome = 0;

      // Calculate product costs and revenue
      for (const product of completeOrderDto.products) {
        const productRevenue = product.quantity * product.salePrice;
        const productCost = product.quantity * product.purchasePrice;
        
        totalRevenue += productRevenue;
        totalCost += productCost;
      }

      // Calculate service income
      for (const service of completeOrderDto.services) {
        serviceIncome += service.charge;
        totalRevenue += service.charge;
      }

      const netProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        success: true,
        message: 'Order completion preview calculated',
        data: {
          preview: {
            totalRevenue: totalRevenue.toFixed(2),
            totalCost: totalCost.toFixed(2),
            netProfit: netProfit.toFixed(2),
            serviceIncome: serviceIncome.toFixed(2),
            productProfit: (totalRevenue - serviceIncome - totalCost).toFixed(2),
            profitMargin: profitMargin.toFixed(2) + '%'
          },
          breakdown: {
            products: completeOrderDto.products.map(product => ({
              name: product.name,
              quantity: product.quantity,
              unitCost: product.purchasePrice,
              unitPrice: product.salePrice,
              totalCost: (product.quantity * product.purchasePrice).toFixed(2),
              totalRevenue: (product.quantity * product.salePrice).toFixed(2),
              profit: (product.quantity * (product.salePrice - product.purchasePrice)).toFixed(2)
            })),
            services: completeOrderDto.services.map(service => ({
              description: service.description,
              charge: service.charge.toFixed(2)
            }))
          }
        },
        statusCode: HttpStatus.OK
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to preview order completion',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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
