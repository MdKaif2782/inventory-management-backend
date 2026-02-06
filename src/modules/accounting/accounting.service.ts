import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreatePocketDto,
  UpdatePocketDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
  SummaryQueryDto,
  ExportQueryDto,
  TransactionType,
  EXPENSE_CATEGORIES,
  VALID_EXPENSE_CATEGORY_VALUES,
} from './dto';
import { PocketTransactionType, ModeOfPayment as PrismaModeOfPayment } from '@prisma/client';

@Injectable()
export class AccountingService {
  constructor(private prisma: DatabaseService) {}

  // ==================== POCKETS ====================

  async createPocket(createPocketDto: CreatePocketDto) {
    // Check for duplicate name
    const existing = await this.prisma.pocket.findUnique({
      where: { name: createPocketDto.name },
    });

    if (existing) {
      throw new ConflictException('Pocket with this name already exists');
    }

    return this.prisma.pocket.create({
      data: createPocketDto,
    });
  }

  async findAllPockets() {
    const pockets = await this.prisma.pocket.findMany({
      include: {
        transactions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return pockets.map((pocket) => {
      const { totalIncome, totalExpenses, balance } = this.calculatePocketBalance(pocket.transactions);
      return {
        id: pocket.id,
        name: pocket.name,
        description: pocket.description,
        createdAt: pocket.createdAt,
        updatedAt: pocket.updatedAt,
        balance,
        totalIncome,
        totalExpenses,
      };
    });
  }

  async findOnePocket(id: string) {
    const pocket = await this.prisma.pocket.findUnique({
      where: { id },
      include: { transactions: true },
    });

    if (!pocket) {
      throw new NotFoundException('Pocket not found');
    }

    const { totalIncome, totalExpenses, balance } = this.calculatePocketBalance(pocket.transactions);

    return {
      id: pocket.id,
      name: pocket.name,
      description: pocket.description,
      createdAt: pocket.createdAt,
      updatedAt: pocket.updatedAt,
      balance,
      totalIncome,
      totalExpenses,
    };
  }

  async updatePocket(id: string, updatePocketDto: UpdatePocketDto) {
    const pocket = await this.prisma.pocket.findUnique({ where: { id } });

    if (!pocket) {
      throw new NotFoundException('Pocket not found');
    }

    // Check for duplicate name if name is being updated
    if (updatePocketDto.name && updatePocketDto.name !== pocket.name) {
      const existing = await this.prisma.pocket.findUnique({
        where: { name: updatePocketDto.name },
      });

      if (existing) {
        throw new ConflictException('Pocket with this name already exists');
      }
    }

    return this.prisma.pocket.update({
      where: { id },
      data: updatePocketDto,
    });
  }

  async deletePocket(id: string) {
    const pocket = await this.prisma.pocket.findUnique({ where: { id } });

    if (!pocket) {
      throw new NotFoundException('Pocket not found');
    }

    await this.prisma.pocket.delete({ where: { id } });

    return { message: 'Pocket deleted successfully' };
  }

  // ==================== TRANSACTIONS ====================

  async createTransaction(pocketId: string, createTransactionDto: CreateTransactionDto) {
    const pocket = await this.prisma.pocket.findUnique({ where: { id: pocketId } });

    if (!pocket) {
      throw new NotFoundException('Pocket not found');
    }

    // Validate category for expenses
    if (createTransactionDto.type === TransactionType.EXPENSE) {
      if (!VALID_EXPENSE_CATEGORY_VALUES.includes(createTransactionDto.category as any)) {
        throw new BadRequestException('Invalid expense category');
      }

      if (createTransactionDto.category === 'other' && !createTransactionDto.customCategory) {
        throw new BadRequestException('Custom category is required when category is "other"');
      }
    }

    // For income, category is always "fund"
    const category = createTransactionDto.type === TransactionType.INCOME 
      ? 'fund' 
      : createTransactionDto.category;

    const transactionData: any = {
      pocketId,
      type: createTransactionDto.type === TransactionType.INCOME 
        ? PocketTransactionType.INCOME 
        : PocketTransactionType.EXPENSE,
      amount: createTransactionDto.amount,
      description: createTransactionDto.description,
      category,
      customCategory: createTransactionDto.customCategory,
      date: new Date(createTransactionDto.date),
    };

    // Add type-specific fields
    if (createTransactionDto.type === TransactionType.INCOME && createTransactionDto.modeOfPayment) {
      transactionData.modeOfPayment = createTransactionDto.modeOfPayment === 'cash' 
        ? PrismaModeOfPayment.CASH 
        : PrismaModeOfPayment.BANK_TRANSFER;
    }

    if (createTransactionDto.type === TransactionType.EXPENSE) {
      transactionData.hasDetailAttached = createTransactionDto.hasDetailAttached ?? false;
    }

    const transaction = await this.prisma.pocketTransaction.create({
      data: transactionData,
    });

    // Get updated pocket balance
    const pocketWithBalance = await this.findOnePocket(pocketId);

    return {
      transaction: this.formatTransaction(transaction),
      pocket: {
        balance: pocketWithBalance.balance,
      },
    };
  }

  async findAllTransactions(pocketId: string, query: TransactionQueryDto) {
    const pocket = await this.prisma.pocket.findUnique({ where: { id: pocketId } });

    if (!pocket) {
      throw new NotFoundException('Pocket not found');
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { pocketId };

    if (query.type) {
      where.type = query.type === TransactionType.INCOME 
        ? PocketTransactionType.INCOME 
        : PocketTransactionType.EXPENSE;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) {
        where.date.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.date.lte = new Date(query.dateTo);
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.pocketTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.pocketTransaction.count({ where }),
    ]);

    // Get summary for this pocket
    const allTransactions = await this.prisma.pocketTransaction.findMany({
      where: { pocketId },
    });

    const { totalIncome, totalExpenses, balance } = this.calculatePocketBalance(allTransactions);

    return {
      transactions: transactions.map(this.formatTransaction),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalIncome,
        totalExpenses,
        balance,
      },
    };
  }

  async findOneTransaction(id: string) {
    const transaction = await this.prisma.pocketTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return this.formatTransaction(transaction);
  }

  async updateTransaction(id: string, updateTransactionDto: UpdateTransactionDto) {
    const transaction = await this.prisma.pocketTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Validate category for expenses if category is being updated
    if (updateTransactionDto.category && transaction.type === PocketTransactionType.EXPENSE) {
      if (!VALID_EXPENSE_CATEGORY_VALUES.includes(updateTransactionDto.category as any)) {
        throw new BadRequestException('Invalid expense category');
      }

      if (updateTransactionDto.category === 'other' && !updateTransactionDto.customCategory) {
        throw new BadRequestException('Custom category is required when category is "other"');
      }
    }

    const updateData: any = {};

    if (updateTransactionDto.amount !== undefined) {
      updateData.amount = updateTransactionDto.amount;
    }
    if (updateTransactionDto.description !== undefined) {
      updateData.description = updateTransactionDto.description;
    }
    if (updateTransactionDto.category !== undefined) {
      updateData.category = updateTransactionDto.category;
    }
    if (updateTransactionDto.customCategory !== undefined) {
      updateData.customCategory = updateTransactionDto.customCategory;
    }
    if (updateTransactionDto.modeOfPayment !== undefined) {
      updateData.modeOfPayment = updateTransactionDto.modeOfPayment === 'cash' 
        ? PrismaModeOfPayment.CASH 
        : PrismaModeOfPayment.BANK_TRANSFER;
    }
    if (updateTransactionDto.hasDetailAttached !== undefined) {
      updateData.hasDetailAttached = updateTransactionDto.hasDetailAttached;
    }
    if (updateTransactionDto.date !== undefined) {
      updateData.date = new Date(updateTransactionDto.date);
    }

    const updated = await this.prisma.pocketTransaction.update({
      where: { id },
      data: updateData,
    });

    return this.formatTransaction(updated);
  }

  async toggleDetailAttached(id: string) {
    const transaction = await this.prisma.pocketTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.type !== PocketTransactionType.EXPENSE) {
      throw new BadRequestException('Can only toggle detail attached for expense transactions');
    }

    const updated = await this.prisma.pocketTransaction.update({
      where: { id },
      data: {
        hasDetailAttached: !transaction.hasDetailAttached,
      },
    });

    return {
      id: updated.id,
      hasDetailAttached: updated.hasDetailAttached,
    };
  }

  async deleteTransaction(id: string) {
    const transaction = await this.prisma.pocketTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    await this.prisma.pocketTransaction.delete({ where: { id } });

    // Get updated pocket balance
    const pocketWithBalance = await this.findOnePocket(transaction.pocketId);

    return {
      message: 'Transaction deleted successfully',
      pocket: {
        balance: pocketWithBalance.balance,
      },
    };
  }

  // ==================== SUMMARY & REPORTS ====================

  async getPocketSummary(pocketId: string, query: SummaryQueryDto) {
    const pocket = await this.prisma.pocket.findUnique({ where: { id: pocketId } });

    if (!pocket) {
      throw new NotFoundException('Pocket not found');
    }

    const where: any = { pocketId };

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) {
        where.date.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.date.lte = new Date(query.dateTo);
      }
    }

    const transactions = await this.prisma.pocketTransaction.findMany({ where });

    const { totalIncome, totalExpenses, balance } = this.calculatePocketBalance(transactions);

    // Group expenses by category
    const expensesByCategory = this.groupExpensesByCategory(
      transactions.filter((t) => t.type === PocketTransactionType.EXPENSE)
    );

    return {
      pocketId: pocket.id,
      pocketName: pocket.name,
      totalIncome,
      totalExpenses,
      balance,
      transactionCount: transactions.length,
      expensesByCategory,
      period: {
        from: query.dateFrom || null,
        to: query.dateTo || null,
      },
    };
  }

  async exportTransactions(pocketId: string, query: ExportQueryDto) {
    const pocket = await this.prisma.pocket.findUnique({ where: { id: pocketId } });

    if (!pocket) {
      throw new NotFoundException('Pocket not found');
    }

    const where: any = { pocketId };

    if (query.type) {
      where.type = query.type === TransactionType.INCOME 
        ? PocketTransactionType.INCOME 
        : PocketTransactionType.EXPENSE;
    }

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) {
        where.date.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.date.lte = new Date(query.dateTo);
      }
    }

    const transactions = await this.prisma.pocketTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Generate CSV
    const headers = [
      'Pocket',
      'Date',
      'Time',
      'Type',
      'Category',
      'Description',
      'Amount',
      'Mode of Payment',
      'Detail Attached',
    ];

    const rows = transactions.map((t) => {
      const date = new Date(t.date);
      const categoryLabel = this.getCategoryLabel(t.category, t.customCategory);
      
      return [
        pocket.name,
        date.toISOString().split('T')[0],
        date.toTimeString().split(' ')[0],
        t.type === PocketTransactionType.INCOME ? 'Income' : 'Expense',
        categoryLabel,
        t.description || '',
        t.amount.toFixed(2),
        t.modeOfPayment || '',
        t.hasDetailAttached ? 'Yes' : 'No',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      filename: `${pocket.name.replace(/\s+/g, '_')}_transactions_${new Date().toISOString().split('T')[0]}.csv`,
      content: csvContent,
    };
  }

  async getExpenseCategories() {
    return EXPENSE_CATEGORIES;
  }

  // ==================== HELPER METHODS ====================

  private calculatePocketBalance(transactions: any[]) {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === PocketTransactionType.INCOME) {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    });

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      balance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    };
  }

  private groupExpensesByCategory(expenses: any[]) {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    expenses.forEach((expense) => {
      const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
      categoryMap.set(expense.category, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      label: this.getCategoryLabel(category, null),
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    }));
  }

  private getCategoryLabel(category: string, customCategory: string | null): string {
    if (category === 'fund') {
      return 'Fund Addition';
    }
    if (category === 'other' && customCategory) {
      return customCategory;
    }
    const found = EXPENSE_CATEGORIES.find((c) => c.value === category);
    return found ? found.label : category;
  }

  private formatTransaction(transaction: any) {
    return {
      id: transaction.id,
      pocketId: transaction.pocketId,
      type: transaction.type === PocketTransactionType.INCOME ? 'income' : 'expense',
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      customCategory: transaction.customCategory,
      modeOfPayment: transaction.modeOfPayment?.toLowerCase() || null,
      hasDetailAttached: transaction.hasDetailAttached,
      date: transaction.date,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
