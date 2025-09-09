// src/orders/orders.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto, OrderType, DeliveryMethod, UrgencyLevel } from './dto/create-order.dto';
import { UpdateOrderStatusDto, OrderStatus } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: DatabaseService) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    const {
      preferredDateTime,
      ...rest
    } = createOrderDto;

    const data: any = {
      ...rest,
      preferredDateTime: preferredDateTime ? new Date(preferredDateTime) : null,
    };

    return this.prisma.order.create({
      data,
    });
  }

  async findAllOrders(query: OrderQueryDto) {
    const { status, orderType, page, limit, sortBy, sortOrder } = query;
    
    const where = {};
    if (status) where['status'] = status;
    if (orderType) where['orderType'] = orderType;

    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOneOrder(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  async updateOrderStatus(id: number, updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderStatusDto.status,
      },
    });
  }

  //upload section
  async uploadFile(file: Express.Multer.File) {
    console.log(file);
    const filename = `${Date.now().toString()}.${file.originalname.split(".").pop()}`;
    const fileObj = await this.prisma.file.create({
      data: { base64: file.buffer.toString("base64"), filename }
    });

    const host = process.env.HOST || "http://localhost:2000";
    return `${host}/orders/file/${fileObj.id}/${filename}`;
  }

  async getFileById(id: number): Promise<{ base64: string; filename: string }> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) {
      throw new NotFoundException("File not found");
    }
    return { base64: file.base64, filename: file.filename };
  }
}
