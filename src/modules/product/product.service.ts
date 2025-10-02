// product.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProductDto, CreateProductWithStockDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InventoryLogType, StaffRole } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private databaseService: DatabaseService) {}

  async generateProductId(): Promise<string> {
    // Count existing products to generate sequential ID
    const productCount = await this.databaseService.product.count();
    return `PRD${(productCount + 1).toString().padStart(3, '0')}`;
  }

  async generateBarcode(): Promise<string> {
    // Generate a 10-digit numeric barcode
    const randomBarcode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    // Check if barcode already exists
    const existingProduct = await this.databaseService.product.findUnique({
      where: { barcode: randomBarcode },
    });
    
    // If exists, generate a new one recursively
    if (existingProduct) {
      return this.generateBarcode();
    }
    
    return randomBarcode;
  }

  async create(createProductDto: CreateProductDto) {
    // Generate product ID and barcode
    const productId = await this.generateProductId();
    const barcode = await this.generateBarcode();
    
    try {
      const product = await this.databaseService.product.create({
        data: {
          productId,
          barcode,
          name: createProductDto.name,
          category: createProductDto.category,
          purchasePrice: createProductDto.purchasePrice,
          salePrice: createProductDto.salePrice,
          quantity: createProductDto.quantity,
        },
      });

      // Create inventory log for the new product
      await this.databaseService.inventoryLog.create({
        data: {
          productId: product.id,
          type: InventoryLogType.ADDED,
          quantity: createProductDto.quantity,
          userId: createProductDto.userId,
          note: 'New product added to inventory',
        },
      });

      return product;
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation (Prisma error code)
        throw new ConflictException('Product with this name or barcode already exists');
      }
      throw error;
    }
  }

  async createWithStockTracking(createProductDto: CreateProductWithStockDto) {
    const { 
      name, 
      barcode, 
      purchasePrice, 
      salePrice, 
      quantity, 
      userId, 
      category,
      previousProductId 
    } = createProductDto;

    try {
      // Case 1: Completely new product (no previousProductId provided)
      if (!previousProductId) {
        const productId = await this.generateProductId();
        const generatedBarcode = barcode || await this.generateBarcode();

        const product = await this.databaseService.product.create({
          data: {
            productId,
            barcode: generatedBarcode,
            name,
            category,
            purchasePrice,
            salePrice,
            quantity,
          },
        });

        // Create inventory log
        await this.databaseService.inventoryLog.create({
          data: {
            productId: product.id,
            type: InventoryLogType.ADDED,
            quantity,
            userId,
            note: 'New product added to inventory',
          },
        });

        return {
          product,
          action: 'CREATED_NEW',
          message: 'New product created successfully'
        };
      }

      // Case 2 & 3: Restocking existing product (previousProductId provided)
      // Find the existing product
      const existingProduct = await this.databaseService.product.findUnique({
        where: { 
          id: previousProductId,
          markDeleted: false 
        },
      });

      if (!existingProduct) {
        throw new NotFoundException('Previous product not found');
      }

      // Check if prices are different
      const hasPriceDiff = existingProduct.purchasePrice !== purchasePrice || 
                          existingProduct.salePrice !== salePrice;

      // Case 2: Price difference - create new generation
      if (hasPriceDiff) {
        const productId = await this.generateProductId();
        const generatedBarcode = await this.generateBarcode();

        // Create new product entity with reference to previous stock
        const newProduct = await this.databaseService.product.create({
          data: {
            productId,
            barcode: generatedBarcode,
            name,
            category,
            purchasePrice,
            salePrice,
            quantity,
            parentGenId: existingProduct.id, // Link to previous generation
          },
        });

        // Create inventory log for new product
        await this.databaseService.inventoryLog.create({
          data: {
            productId: newProduct.id,
            type: InventoryLogType.ADDED,
            quantity,
            userId,
            note: `New stock with updated prices. Previous stock ID: ${existingProduct.productId}`,
          },
        });

        return {
          product: newProduct,
          previousProduct: existingProduct,
          action: 'CREATED_NEW_GENERATION',
          message: 'New product generation created with updated prices'
        };
      }

      // Case 3: No price difference - update stock of existing product
      const updatedProduct = await this.databaseService.product.update({
        where: { id: existingProduct.id },
        data: {
          quantity: existingProduct.quantity + quantity,
        },
      });

      // Create inventory log for stock update
      await this.databaseService.inventoryLog.create({
        data: {
          productId: existingProduct.id,
          type: InventoryLogType.ADDED,
          quantity,
          userId,
          note: 'Stock updated for existing product',
        },
      });

      return {
        product: updatedProduct,
        action: 'STOCK_UPDATED',
        message: 'Product stock updated successfully'
      };

    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Product with this barcode already exists');
      }
      throw error;
    }
  }

  // Helper method to search products for UI selection
  async searchProducts(searchTerm: string) {
    return this.databaseService.product.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { productId: { contains: searchTerm, mode: 'insensitive' } },
          { barcode: { contains: searchTerm, mode: 'insensitive' } },
        ],
        markDeleted: false,
      },
      select: {
        id: true,
        productId: true,
        name: true,
        category: true,
        barcode: true,
        purchasePrice: true,
        salePrice: true,
        quantity: true,
      },
      take: 10,
    });
  }

  // Get product details for pre-filling form
  async getProductForRestock(productId: string) {
    const product = await this.databaseService.product.findUnique({
      where: { 
        id: productId,
        markDeleted: false 
      },
      select: {
        id: true,
        productId: true,
        name: true,
        category: true,
        barcode: true,
        purchasePrice: true,
        salePrice: true,
        quantity: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  // Helper method to get product lineage
  async getProductLineage(productId: string) {
    return this.databaseService.product.findUnique({
      where: { id: productId },
      include: {
        parentGen: {
          include: {
            parentGen: true, // Recursive inclusion for full lineage
          },
        },
        prevStock: {
          include: {
            prevStock: true,
          },
        },
      },
    });
  }


  async findAll(search?: string, category?: string) {
    const where: any = {};
    
    where.markDeleted = false;

    if (search) {
      where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
      { productId: { contains: search } },
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    return this.databaseService.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.databaseService.product.findUnique({
      where: { id },
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }

  async findByProductId(productId: string) {
    const product = await this.databaseService.product.findUnique({
      where: { productId },
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.databaseService.product.findUnique({
      where: { barcode },
    });
    
    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }
    
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const oldProduct = await this.databaseService.product.findUnique({
        where: { id },
      });
      
      if (!oldProduct) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      
      const product = await this.databaseService.product.update({
        where: { id },
        data: {
          name: updateProductDto.name,
          category: updateProductDto.category,
          purchasePrice: updateProductDto.purchasePrice,
          salePrice: updateProductDto.salePrice,
          quantity: updateProductDto.quantity,
        },
      });
      
      // Check if quantity changed and create inventory log
      if (updateProductDto.quantity !== undefined && 
          updateProductDto.quantity !== oldProduct.quantity) {
        const quantityDiff = updateProductDto.quantity - oldProduct.quantity;
        const logType = quantityDiff > 0 ? InventoryLogType.IN : InventoryLogType.OUT;
        
        await this.databaseService.inventoryLog.create({
          data: {
            productId: product.id,
            type: logType,
            quantity: Math.abs(quantityDiff),
            userId: updateProductDto.userId,
            note: 'Product quantity updated',
          },
        });
      }
      
      // Create edit log if any other field changed
      const { quantity, userId, ...otherFields } = updateProductDto;
      if (Object.keys(otherFields).length > 0) {
        await this.databaseService.inventoryLog.create({
          data: {
            productId: product.id,
            type: InventoryLogType.EDITED,
            userId: updateProductDto.userId,
            note: 'Product information updated',
          },
        });
      }
      
      return product;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    try {
      const product = await this.databaseService.product.update({
        where: { id },
        data: {
          markDeleted: true,
        }
      });
      
      // Create inventory log for product deletion
      await this.databaseService.inventoryLog.create({
        data: {
          productId: id,
          type: InventoryLogType.OUT,
          quantity: product.quantity,
          userId,
          note: 'Product removed from inventory',
        },
      });
      
      return product;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      throw error;
    }
  }

  async getInventoryLogs(productId?: string, type?: InventoryLogType, userId?: string) {
    const where: any = {};
    
    if (productId) {
      where.productId = productId;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    return this.databaseService.inventoryLog.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            barcode: true,
            productId: true,
          },
        },
        user: {
          select: {
            fullName: true,
            username: true,
            staffId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCategories() {
    const categories = await this.databaseService.product.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
    });
    
    return categories.map(cat => ({
      name: cat.category,
      count: cat._count.category,
    }));
  }
}