// pos.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSaleDto, AddToCartDto, SearchProductsDto } from './dto';
import { InventoryLogType } from '@prisma/client';

// In-memory cart storage (in production, you might want to use Redis)
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  barcode: string;
  category: string;
}

interface Cart {
  [cashierId: string]: CartItem[];
}

@Injectable()
export class PosService {
  private carts: Cart = {};

  constructor(private databaseService: DatabaseService) {}

  async searchProducts(searchParams: SearchProductsDto) {
    const { query, category } = searchParams;
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query } },
        { productId: { contains: query } },
      ];
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    return this.databaseService.product.findMany({
      where,
      select: {
        id: true,
        productId: true,
        name: true,
        category: true,
        barcode: true,
        salePrice: true,
        quantity: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProductByBarcode(barcode: string) {
    const product = await this.databaseService.product.findUnique({
      where: { barcode },
      select: {
        id: true,
        productId: true,
        name: true,
        category: true,
        barcode: true,
        salePrice: true,
        quantity: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return product;
  }

  async addToCart(addToCartDto: AddToCartDto) {
    const { cashierId, productId, quantity } = addToCartDto;

    // Initialize cart if it doesn't exist
    if (!this.carts[cashierId]) {
      this.carts[cashierId] = [];
    }

    // Check if product is already in cart
    const existingItemIndex = await this.carts[cashierId].findIndex(
      item => item.productId === productId,
    );

    if (existingItemIndex >= 0) {
      // Update quantity if product already in cart
      this.carts[cashierId][existingItemIndex].quantity += quantity;
    } else {
      // Get product details
      const product = await this.databaseService.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          barcode: true,
          category: true,
          salePrice: true,
          quantity: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Check if enough stock is available
      if (product.quantity < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Only ${product.quantity} available`,
        );
      }

      // Add new item to cart
      await this.carts[cashierId].push({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        price: product.salePrice,
        quantity,
      });
    }

    return this.carts[cashierId];
  }

  async clearCart(cashierId: string) {
    await (this.carts[cashierId] = []);
    return { message: 'Cart cleared successfully' };
  }

  getCart(cashierId: string) {
    return this.carts[cashierId] || [];
  }

  async checkout(createSaleDto: CreateSaleDto) {
    const { cashierId, items } = createSaleDto;

    // Verify cashier exists and is active
    const cashier = await this.databaseService.staff.findUnique({
      where: { id: cashierId },
    });

    if (!cashier || cashier.status !== 'ACTIVE') {
      throw new ForbiddenException('Invalid cashier');
    }

    // Generate sale ID
    const saleCount = await this.databaseService.sale.count();
    const saleId = `SALE${(saleCount + 1).toString().padStart(3, '0')}`;

    // Calculate total
    const total = items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    // Create sale transaction
    const sale = await this.databaseService.$transaction(async (prisma) => {
      // Create sale record
      const newSale = await prisma.sale.create({
        data: {
          saleId,
          cashierId,
          total,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  barcode: true,
                },
              },
            },
          },
          cashier: {
            select: {
              fullName: true,
              staffId: true,
            },
          },
        },
      });

      // Update product quantities and create inventory logs
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (product.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Only ${product.quantity} available`,
          );
        }

        // Update product quantity
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: product.quantity - item.quantity,
          },
        });

        // Create inventory log
        await prisma.inventoryLog.create({
          data: {
            productId: item.productId,
            type: InventoryLogType.OUT,
            quantity: item.quantity,
            userId: cashierId,
            note: `Sold in sale ${saleId}`,
          },
        });
      }

      return newSale;
    });

    // Clear the cart after successful checkout
    this.carts[cashierId] = [];

    return sale;
  }
}