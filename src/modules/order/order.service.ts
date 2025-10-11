// src/orders/orders.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto,  DeliveryMethod, UrgencyLevel } from './dto/create-order.dto';
import { UpdateOrderStatusDto, OrderStatus } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { DatabaseService } from '../database/database.service';
import { CompleteOrderDto, OrderProductItemDto } from './dto/complete-order.dto';
import { InventoryLogType, OrderType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: DatabaseService) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    const {
      preferredDateTime,
      idCardData,
      ...rest
    } = createOrderDto;

    const data: any = {
      ...rest,
      preferredDateTime: preferredDateTime ? new Date(preferredDateTime) : null,
    };

    // Handle ID card order specific fields
    if (createOrderDto.orderType === OrderType.IDCARD_ORDER) {
      if (!idCardData) {
        throw new BadRequestException('idCardData is required for ID card orders');
      }
      
      data.idCardData = idCardData;
      data.idCardCount = Array.isArray(idCardData) ? idCardData.length : 1;
      
      // Validate ID card data structure
      if (Array.isArray(idCardData)) {
        for (const card of idCardData) {
          if (typeof card !== 'object' || card === null) {
            throw new BadRequestException('Each ID card entry must be a valid JSON object');
          }
        }
      }
    } else {
      // Clear ID card specific fields for non-ID card orders
      data.idCardData = null;
      data.idCardTemplate = null;
      data.idCardCount = null;
    }

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

    // ✅ exclude fake orders
    where.NOT = {
      AND: [
        { phone: "N/A" },
        { fullName: { startsWith: "Sale SALE" } }, // matches Sale SALE1, Sale SALE23...
      ],
    };

    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    const skip = (pageNum - 1) * limitNum;

    // ✅ normalize sort order
    const validSortOrders: ("asc" | "desc")[] = ["asc", "desc"];
    const normalizedSortOrder: "asc" | "desc" =
      validSortOrders.includes(sortOrder.toLowerCase() as "asc" | "desc")
        ? (sortOrder.toLowerCase() as "asc" | "desc")
        : "desc";

    const validSortFields = ["createdAt", "updatedAt", "id", "idCardCount"]; // added idCardCount
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limitNum, // ✅ number
        orderBy: {
          [sortField]: normalizedSortOrder,
        },
        include: {
          serviceSold: true,
          productSold: true,
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
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        serviceSold: true,
        productSold: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findIdCardOrders(query: { page?: string; limit?: string }) {
    const pageNum = parseInt(query.page || "1", 10);
    const limitNum = parseInt(query.limit || "10", 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      orderType: OrderType.IDCARD_ORDER,
      NOT: {
        AND: [
          { phone: "N/A" },
          { fullName: { startsWith: "Sale SALE" } },
        ],
      },
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
          idCardCount: true,
          idCardTemplate: true,
          urgency: true,
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

  async updateOrderStatus(id: number, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOneOrder(id);
    
    return this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderStatusDto.status,
      },
    });
  }

  // Upload section
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

  async completeOrder(orderId: number, completeOrderDto: CompleteOrderDto) {
    // 1. Verify order exists and is in valid state
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        serviceSold: true,
        productSold: true
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Order is already completed');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled order');
    }

    // 2. Verify staff exists
    const staff = await this.prisma.staff.findUnique({
      where: { staffId: completeOrderDto.staffId }
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${completeOrderDto.staffId} not found`);
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let serviceIncome = 0;
    const productIds: string[] = [];

    // 3. Process Products
    for (const productDto of completeOrderDto.products) {
      let product;
      
      if (productDto.productId) {
        // Use existing product
        product = await this.prisma.product.findUnique({
          where: { id: productDto.productId }
        });
        
        if (!product) {
          throw new NotFoundException(`Product with ID ${productDto.productId} not found`);
        }

        if (product.quantity < productDto.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}`);
        }

        // Update existing product details if needed
        product = await this.prisma.product.update({
          where: { id: productDto.productId },
          data: {
            name: productDto.name,
            category: productDto.category,
            barcode: productDto.barcode,
            purchasePrice: productDto.purchasePrice,
            salePrice: productDto.salePrice,
            quantity: { decrement: productDto.quantity },
          }
        });
      } else {
        // Create new product
        const productIdCounter = await this.prisma.product.count();
        const newProductId = `PRD${String(productIdCounter + 1).padStart(3, '0')}`;
        
        product = await this.prisma.product.create({
          data: {
            productId: newProductId,
            name: productDto.name,
            category: productDto.category,
            barcode: productDto.barcode,
            purchasePrice: productDto.purchasePrice,
            salePrice: productDto.salePrice,
            quantity: 0, // Set to 0 as it's being sold immediately
          }
        });
      }

      productIds.push(product.id);

      // Calculate costs and revenue for this product
      const productRevenue = productDto.quantity * productDto.salePrice;
      const productCost = productDto.quantity * productDto.purchasePrice;
      
      totalRevenue += productRevenue;
      totalCost += productCost;

      // Create inventory log for product sale
      await this.prisma.inventoryLog.create({
        data: {
          productId: product.id,
          type: InventoryLogType.OUT,
          quantity: productDto.quantity,
          userId: staff.id,
          note: `Product sold through order completion - Order #${orderId}`
        }
      });
    }

    // 4. Process Services
    for (const serviceDto of completeOrderDto.services) {
      serviceIncome += serviceDto.charge;
      totalRevenue += serviceDto.charge;
      
      // Create order service item
      await this.prisma.orderServiceItem.create({
        data: {
          orderId: orderId,
          description: serviceDto.description,
          charge: serviceDto.charge
        }
      });
    }

    // 5. Handle ID Card Order specific completion
    if (order.orderType === OrderType.IDCARD_ORDER) {
      // Create a special service item for ID card printing if not already included
      const hasIdCardService = completeOrderDto.services.some(service => 
        service.description.toLowerCase().includes('id card') || 
        service.description.toLowerCase().includes('printing')
      );

      if (!hasIdCardService && order.idCardCount && order.idCardCount > 0) {
        const idCardServiceCharge = completeOrderDto.idCardPrintingCharge || (order.idCardCount * 5); // Default $5 per card
        
        await this.prisma.orderServiceItem.create({
          data: {
            orderId: orderId,
            description: `ID Card Printing (${order.idCardCount} cards)`,
            charge: idCardServiceCharge
          }
        });
        
        serviceIncome += idCardServiceCharge;
        totalRevenue += idCardServiceCharge;
      }

      // Create completion log for ID card order
      await this.prisma.inventoryLog.create({
        data: {
          type: InventoryLogType.EDITED,
          quantity: order.idCardCount,
          userId: staff.id,
          note: `ID Card Order #${orderId} completed - ${order.idCardCount} cards printed for ${order.fullName}`
        }
      });
    }

    // 6. Create Sale record if products were sold
    if (completeOrderDto.products.length > 0) {
      const saleIdCounter = await this.prisma.sale.count();
      const newSaleId = `SALE${String(saleIdCounter + 1).padStart(3, '0')}`;

      const sale = await this.prisma.sale.create({
        data: {
          saleId: newSaleId,
          cashierId: staff.id,
          total: totalRevenue - serviceIncome, // Only product revenue
          items: {
            create: completeOrderDto.products.map((productDto, index) => {
              return {
                productId: productIds[index],
                quantity: productDto.quantity,
                price: productDto.salePrice
              };
            })
          }
        }
      });
    }

    // 7. Update order status and link products
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        productSold: {
          connect: productIds.map(id => ({ id }))
        }
      },
      include: {
        serviceSold: true,
        productSold: true
      }
    });

    // 8. Update Financial Report
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const existingReport = await this.prisma.financialReport.findFirst({
      where: { period: currentPeriod }
    });

    if (existingReport) {
      await this.prisma.financialReport.update({
        where: { id: existingReport.id },
        data: {
          totalRevenue: { increment: totalRevenue },
          totalCost: { increment: totalCost },
          netProfit: { increment: totalRevenue - totalCost },
          netIncomeFromService: { increment: serviceIncome },
          profitMargin: existingReport.totalRevenue + totalRevenue > 0 
            ? ((existingReport.netProfit + (totalRevenue - totalCost)) / (existingReport.totalRevenue + totalRevenue)) * 100
            : 0
        }
      });
    } else {
      const netProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      
      await this.prisma.financialReport.create({
        data: {
          period: currentPeriod,
          totalRevenue,
          totalCost,
          netProfit,
          netIncomeFromService: serviceIncome,
          profitMargin
        }
      });
    }

    return {
      order: updatedOrder,
      financialSummary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        netProfit: (totalRevenue - totalCost).toFixed(2),
        serviceIncome: serviceIncome.toFixed(2),
        productProfit: (totalRevenue - serviceIncome - totalCost).toFixed(2)
      }
    };
  }

  // Helper method to get ID card order details
  async getIdCardOrderDetails(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { 
        id,
        orderType: OrderType.IDCARD_ORDER 
      },
      select: {
        id: true,
        createdAt: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
        idCardData: true,
        idCardTemplate: true,
        idCardCount: true,
        fileUrl: true,
        customRequest: true,
        urgency: true,
      }
    });

    if (!order) {
      throw new NotFoundException(`ID Card order with ID ${id} not found`);
    }

    return order;
  }
}