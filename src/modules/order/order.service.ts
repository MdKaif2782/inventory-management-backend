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
  const {
    status,
    orderType,
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // ✅ convert strings to numbers
  const pageNum = parseInt(page as any, 10);
  const limitNum = parseInt(limit as any, 10);

  const where: any = {};
  if (status) where.status = status;
  if (orderType) where.orderType = orderType;

  const skip = (pageNum - 1) * limitNum;

  // ✅ normalize sort order
  const validSortOrders: ("asc" | "desc")[] = ["asc", "desc"];
  const normalizedSortOrder: "asc" | "desc" =
    validSortOrders.includes(sortOrder.toLowerCase() as "asc" | "desc")
      ? (sortOrder.toLowerCase() as "asc" | "desc")
      : "desc";

  const validSortFields = ["createdAt", "updatedAt", "id"]; // adjust to your schema
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

  const [orders, total] = await Promise.all([
    this.prisma.order.findMany({
      where,
      skip,
      take: limitNum, // ✅ number
      orderBy: {
        [sortField]: normalizedSortOrder,
      },
    }),
    this.prisma.order.count({ where }),
  ]);

  return {
    data: orders,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
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
