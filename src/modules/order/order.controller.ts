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
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { Response } from 'express';
import mime from 'mime';
import { FileInterceptor } from "@nestjs/platform-express";
import { CompleteOrderDto } from './dto/complete-order.dto';
import { OrdersService } from './order.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    try {
      const order = await this.ordersService.createOrder(createOrderDto);
      
      return {
        success: true,
        message: 'Order created successfully',
        data: order,
        statusCode: HttpStatus.CREATED
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create order',
          statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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

      // Add ID card printing charge if provided
      if (completeOrderDto.idCardPrintingCharge) {
        serviceIncome += completeOrderDto.idCardPrintingCharge;
        totalRevenue += completeOrderDto.idCardPrintingCharge;
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
            })),
            ...(completeOrderDto.idCardPrintingCharge && {
              idCardPrinting: {
                description: 'ID Card Printing Service',
                charge: completeOrderDto.idCardPrintingCharge.toFixed(2)
              }
            })
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
    try {
      const fileUrl = await this.ordersService.uploadFile(file);
      
      return {
        success: true,
        message: 'File uploaded successfully',
        data: { fileUrl },
        statusCode: HttpStatus.CREATED
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to upload file',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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
        res.status(404).json({ 
          success: false,
          message: error.message,
          statusCode: 404
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: "Internal server error",
          statusCode: 500
        });
      }
    }
  }

  @Get()
  async findAll(@Query() query: OrderQueryDto) {
    try {
      const result = await this.ordersService.findAllOrders(query);
      
      return {
        success: true,
        message: 'Orders retrieved successfully',
        data: result.data,
        meta: result.meta,
        statusCode: HttpStatus.OK
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve orders',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // New endpoint for ID card orders
  @Get('id-card/get')
  async findIdCardOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const result = await this.ordersService.findIdCardOrders({ page, limit });
      
      return {
        success: true,
        message: 'ID card orders retrieved successfully',
        data: result.data,
        meta: result.meta,
        statusCode: HttpStatus.OK
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve ID card orders',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const order = await this.ordersService.findOneOrder(id);
      
      return {
        success: true,
        message: 'Order retrieved successfully',
        data: order,
        statusCode: HttpStatus.OK
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve order',
          statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // New endpoint for ID card order details
  @Get(':id/id-card-details')
  async getIdCardOrderDetails(@Param('id', ParseIntPipe) id: number) {
    try {
      const order = await this.ordersService.getIdCardOrderDetails(id);
      
      return {
        success: true,
        message: 'ID card order details retrieved successfully',
        data: order,
        statusCode: HttpStatus.OK
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve ID card order details',
          statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    try {
      const order = await this.ordersService.updateOrderStatus(id, updateOrderStatusDto);
      
      return {
        success: true,
        message: 'Order status updated successfully',
        data: order,
        statusCode: HttpStatus.OK
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update order status',
          statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}