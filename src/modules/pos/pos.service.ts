// pos.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { 
  CreateSaleDto, 
  AddToCartDto, 
  SearchProductsDto, 
  AddServiceToCartDto, 
  AddAdditionalProductToCartDto,
  ServiceItemDto,
  AdditionalProductDto 
} from './dto';
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

export interface ServiceCartItem {
  description: string;
  charge: number;
  tempId: string; // Unique identifier for cart management
}

export interface AdditionalProductCartItem {
  name: string;
  category: string;
  barcode?: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  tempId: string; // Unique identifier for cart management
}

interface Cart {
  [cashierId: string]: {
    products: CartItem[];
    services: ServiceCartItem[];
    additionalProducts: AdditionalProductCartItem[];
  };
}

@Injectable()
export class PosService {
  private carts: Cart = {};

  constructor(private databaseService: DatabaseService) {}

  private initializeCart(cashierId: string) {
    if (!this.carts[cashierId]) {
      this.carts[cashierId] = {
        products: [],
        services: [],
        additionalProducts: []
      };
    }
  }

  async searchProducts(searchParams: SearchProductsDto) {
    const { query, category } = searchParams;
    const where: any = {};

    where.markDeleted = false;

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

    this.initializeCart(cashierId);

    // Check if product is already in cart
    const existingItemIndex = this.carts[cashierId].products.findIndex(
      item => item.productId === productId,
    );

    if (existingItemIndex >= 0) {
      // Update quantity if product already in cart
      this.carts[cashierId].products[existingItemIndex].quantity += quantity;
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
      this.carts[cashierId].products.push({
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

  async addServiceToCart(addServiceToCartDto: AddServiceToCartDto) {
    const { cashierId, description, charge } = addServiceToCartDto;

    this.initializeCart(cashierId);

    // Generate a temporary ID for cart management
    const tempId = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.carts[cashierId].services.push({
      description,
      charge,
      tempId
    });

    return this.carts[cashierId];
  }

  async addAdditionalProductToCart(addAdditionalProductDto: AddAdditionalProductToCartDto) {
    const { cashierId, name, category, barcode, purchasePrice, salePrice, quantity } = addAdditionalProductDto;

    this.initializeCart(cashierId);

    // Check if barcode already exists (if provided)
    if (barcode) {
      const existingProduct = await this.databaseService.product.findUnique({
        where: { barcode }
      });

      if (existingProduct) {
        throw new ConflictException(`Product with barcode ${barcode} already exists`);
      }
    }

    // Generate a temporary ID for cart management
    const tempId = `additional_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.carts[cashierId].additionalProducts.push({
      name,
      category,
      barcode,
      purchasePrice,
      salePrice,
      quantity,
      tempId
    });

    return this.carts[cashierId];
  }

  async removeServiceFromCart(cashierId: string, tempId: string) {
    this.initializeCart(cashierId);
    
    this.carts[cashierId].services = this.carts[cashierId].services.filter(
      service => service.tempId !== tempId
    );

    return this.carts[cashierId];
  }

  async removeAdditionalProductFromCart(cashierId: string, tempId: string) {
    this.initializeCart(cashierId);
    
    this.carts[cashierId].additionalProducts = this.carts[cashierId].additionalProducts.filter(
      product => product.tempId !== tempId
    );

    return this.carts[cashierId];
  }

  async clearCart(cashierId: string) {
    this.carts[cashierId] = {
      products: [],
      services: [],
      additionalProducts: []
    };
    return { message: 'Cart cleared successfully' };
  }

  getCart(cashierId: string) {
    this.initializeCart(cashierId);
    return this.carts[cashierId];
  }

  // Backward compatible method for old API calls
  getCartProducts(cashierId: string) {
    this.initializeCart(cashierId);
    return this.carts[cashierId].products;
  }

  private async generateBarcode(): Promise<string> {
    let barcode: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      // Generate a random barcode with timestamp and random digits
      barcode = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      attempts++;

      if (attempts >= maxAttempts) {
        throw new BadRequestException('Unable to generate unique barcode');
      }

      const existingProduct = await this.databaseService.product.findUnique({
        where: { barcode }
      });

      if (!existingProduct) {
        break;
      }
    } while (attempts < maxAttempts);

    return barcode;
  }

  private async generateProductId(): Promise<string> {
    const productCount = await this.databaseService.product.count();
    return `PRD${(productCount + 1).toString().padStart(3, '0')}`;
  }

async checkout(createSaleDto: CreateSaleDto) {
  const { cashierId, items, services = [], additionalProducts = [] } = createSaleDto;

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

  // Calculate totals
  const productTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceTotal = services.reduce((sum, s) => sum + s.charge, 0);
  const additionalProductTotal = additionalProducts.reduce((sum, p) => sum + p.salePrice * p.quantity, 0);
  const total = productTotal + serviceTotal + additionalProductTotal;

  // ✅ Validate product stock before making updates
  for (const item of items) {
    const product = await this.databaseService.product.findUnique({
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
  }

  const createdAdditionalProducts: { id: string; quantity: number; salePrice: number }[] = [];

  // Handle additional products (add new ones into DB)
  for (const additionalProduct of additionalProducts) {
    const productId = await this.generateProductId();
    const barcode = additionalProduct.barcode || await this.generateBarcode();

    const newProduct = await this.databaseService.product.create({
      data: {
        productId,
        name: additionalProduct.name,
        category: additionalProduct.category,
        barcode,
        purchasePrice: additionalProduct.purchasePrice,
        salePrice: additionalProduct.salePrice,
        quantity: additionalProduct.quantity,
      }
    });

    await this.databaseService.inventoryLog.create({
      data: {
        productId: newProduct.id,
        type: InventoryLogType.ADDED,
        quantity: additionalProduct.quantity,
        userId: cashierId,
        note: `Added new product for sale ${saleId}`,
      },
    });

    createdAdditionalProducts.push({
      id: newProduct.id,
      quantity: additionalProduct.quantity,
      salePrice: additionalProduct.salePrice
    });
  }

  // Create sale record
  const saleItems = [
    ...items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
    ...createdAdditionalProducts.map(product => ({
      productId: product.id,
      quantity: product.quantity,
      price: product.salePrice,
    }))
  ];

  const newSale = await this.databaseService.sale.create({
    data: {
      saleId,
      cashierId,
      total,
      items: {
        create: saleItems,
      },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, barcode: true } },
        },
      },
      cashier: { select: { fullName: true, staffId: true } },
    },
  });

  // Create service order if needed
  if (services.length > 0) {
    await this.databaseService.order.create({
      data: {
        fullName: `Sale ${saleId}`,
        phone: 'N/A',
        orderType: 'SERVICE',
        deliveryMethod: 'PICKUP',
        urgency: 'NORMAL',
        agreement: true,
        status: 'COMPLETED',
        serviceSold: {
          create: services.map(service => ({
            description: service.description,
            charge: service.charge,
          })),
        },
      },
      include: { serviceSold: true },
    });
  }

  // Update product quantities & log sales
  for (const item of items) {
    const product = await this.databaseService.product.findUnique({
      where: { id: item.productId },
    });

    await this.databaseService.product.update({
      where: { id: item.productId },
      data: { quantity: product.quantity - item.quantity },
    });

    await this.databaseService.inventoryLog.create({
      data: {
        productId: item.productId,
        type: InventoryLogType.OUT,
        quantity: item.quantity,
        userId: cashierId,
        note: `Sold in sale ${saleId}`,
      },
    });
  }

  // Additional products → set quantity to 0 after sale
  for (const additionalProduct of createdAdditionalProducts) {
    await this.databaseService.product.update({
      where: { id: additionalProduct.id },
      data: { quantity: 0 },
    });

    await this.databaseService.inventoryLog.create({
      data: {
        productId: additionalProduct.id,
        type: InventoryLogType.OUT,
        quantity: additionalProduct.quantity,
        userId: cashierId,
        note: `Sold entire stock in sale ${saleId}`,
      },
    });
  }

  // Clear cart
  this.carts[cashierId] = { products: [], services: [], additionalProducts: [] };

  return {
    ...newSale,
    serviceTotal,
    additionalProductTotal,
    totalServices: services.length,
    totalAdditionalProducts: additionalProducts.length
  };
}


}