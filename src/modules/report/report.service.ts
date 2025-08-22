// report.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { 
  ReportFilterDto, 
  FinancialSummaryDto, 
  MonthlyDataDto, 
  CategoryDataDto, 
  ProductPerformanceDto 
} from './dto';
import { 
  addDays, 
  subDays, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  format, 
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
  differenceInDays
} from 'date-fns';

// Color palette for charts
const CATEGORY_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

@Injectable()
export class ReportService {
  constructor(private databaseService: DatabaseService) {}

  private getDateRange(filter: ReportFilterDto): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (filter.period) {
      case 'day':
        start = startOfDay(now);
        break;
      case 'week':
        start = startOfDay(subDays(now, 7));
        break;
      case 'month':
        start = startOfDay(subMonths(now, 1));
        break;
      case 'quarter':
        start = startOfDay(subMonths(now, 3));
        break;
      case 'year':
        start = startOfDay(subMonths(now, 12));
        break;
      case 'custom':
        start = filter.startDate ? startOfDay(filter.startDate) : startOfDay(subMonths(now, 1));
        end = filter.endDate ? endOfDay(filter.endDate) : endOfDay(now);
        break;
      default:
        start = startOfDay(subMonths(now, 1));
    }

    return { start, end };
  }

  private getPreviousPeriod(currentStart: Date, currentEnd: Date): { start: Date; end: Date } {
    const periodLength = differenceInDays(currentEnd, currentStart);
    const previousEnd = startOfDay(currentStart);
    const previousStart = subDays(previousEnd, periodLength);
    
    return {
      start: startOfDay(previousStart),
      end: endOfDay(previousEnd)
    };
  }

  async getFinancialSummary(filter: ReportFilterDto): Promise<FinancialSummaryDto> {
    const { start, end } = this.getDateRange(filter);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range');
    }

    const previousPeriod = this.getPreviousPeriod(start, end);

    // Get current period sales
    const currentSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Get previous period sales for comparison
    const previousSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: {
          gte: previousPeriod.start,
          lte: previousPeriod.end,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Calculate current period metrics
    let totalRevenue = 0;
    let totalCost = 0;

    currentSales.forEach(sale => {
      sale.items.forEach(item => {
        totalRevenue += item.price * item.quantity;
        totalCost += item.product.purchasePrice * item.quantity;
      });
    });

    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Calculate previous period metrics
    let prevTotalRevenue = 0;
    let prevTotalCost = 0;

    previousSales.forEach(sale => {
      sale.items.forEach(item => {
        prevTotalRevenue += item.price * item.quantity;
        prevTotalCost += item.product.purchasePrice * item.quantity;
      });
    });

    const prevNetProfit = prevTotalRevenue - prevTotalCost;
    const prevProfitMargin = prevTotalRevenue > 0 ? (prevNetProfit / prevTotalRevenue) * 100 : 0;

    // Calculate changes
    const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : totalRevenue > 0 ? 100 : 0;
    const costChange = prevTotalCost > 0 ? ((totalCost - prevTotalCost) / prevTotalCost) * 100 : totalCost > 0 ? 100 : 0;
    const profitChange = prevNetProfit > 0 ? ((netProfit - prevNetProfit) / prevNetProfit) * 100 : netProfit > 0 ? 100 : 0;
    const marginChange = profitMargin - prevProfitMargin;

    return {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      revenueChange,
      costChange,
      profitChange,
      marginChange,
    };
  }

  async getMonthlyData(filter: ReportFilterDto): Promise<MonthlyDataDto[]> {
    const { start, end } = this.getDateRange(filter);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range');
    }

    const months = eachMonthOfInterval({ start, end });
    
    const monthlyData: MonthlyDataDto[] = [];

    for (const month of months) {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const sales = await this.databaseService.sale.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      let revenue = 0;
      let cost = 0;

      sales.forEach(sale => {
        sale.items.forEach(item => {
          revenue += item.price * item.quantity;
          cost += item.product.purchasePrice * item.quantity;
        });
      });

      monthlyData.push({
        month: format(month, 'MMM'),
        revenue,
        cost,
        profit: revenue - cost,
      });
    }

    return monthlyData;
  }

  async getCategoryData(filter: ReportFilterDto): Promise<CategoryDataDto[]> {
    const { start, end } = this.getDateRange(filter);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range');
    }

    const sales = await this.databaseService.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const categoryMap = new Map<string, number>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const category = item.product.category;
        const profit = (item.price - item.product.purchasePrice) * item.quantity;
        
        if (categoryMap.has(category)) {
          categoryMap.set(category, categoryMap.get(category) + profit);
        } else {
          categoryMap.set(category, profit);
        }
      });
    });

    const categoryData: CategoryDataDto[] = [];
    let colorIndex = 0;

    categoryMap.forEach((value, name) => {
      categoryData.push({
        name,
        value,
        color: CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length],
      });
      colorIndex++;
    });

    return categoryData;
  }

  async getProductPerformance(filter: ReportFilterDto): Promise<ProductPerformanceDto[]> {
    const { start, end } = this.getDateRange(filter);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range');
    }

    const sales = await this.databaseService.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const productMap = new Map<string, ProductPerformanceDto>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = item.product;
        
        if (productMap.has(product.id)) {
          const existing = productMap.get(product.id);
          existing.unitsSold += item.quantity;
          existing.totalRevenue += item.price * item.quantity;
          existing.totalCost += product.purchasePrice * item.quantity;
          existing.totalProfit = existing.totalRevenue - existing.totalCost;
          existing.profitMargin = existing.totalRevenue > 0 ? (existing.totalProfit / existing.totalRevenue) * 100 : 0;
        } else {
          productMap.set(product.id, {
            productId: product.productId,
            productName: product.name,
            category: product.category,
            unitsSold: item.quantity,
            costPrice: product.purchasePrice,
            sellingPrice: item.price,
            totalRevenue: item.price * item.quantity,
            totalCost: product.purchasePrice * item.quantity,
            totalProfit: (item.price - product.purchasePrice) * item.quantity,
            profitMargin: item.price > 0 ? ((item.price - product.purchasePrice) / item.price) * 100 : 0,
          });
        }
      });
    });

    return Array.from(productMap.values());
  }

  async exportReport(filter: ReportFilterDto, format: 'csv' | 'json' = 'csv'): Promise<string> {
    const summary = await this.getFinancialSummary(filter);
    const monthlyData = await this.getMonthlyData(filter);
    const categoryData = await this.getCategoryData(filter);
    const productPerformance = await this.getProductPerformance(filter);

    if (format === 'json') {
      return JSON.stringify({
        summary,
        monthlyData,
        categoryData,
        productPerformance,
      }, null, 2);
    }

    // CSV format
    let csv = 'Financial Report\n\n';
    
    // Summary section
    csv += 'SUMMARY\n';
    csv += 'Metric,Value,Change\n';
    csv += `Total Revenue,${summary.totalRevenue},${summary.revenueChange.toFixed(2)}%\n`;
    csv += `Total Cost,${summary.totalCost},${summary.costChange.toFixed(2)}%\n`;
    csv += `Net Profit,${summary.netProfit},${summary.profitChange.toFixed(2)}%\n`;
    csv += `Profit Margin,${summary.profitMargin.toFixed(2)}%,${summary.marginChange.toFixed(2)}%\n\n`;
    
    // Monthly data section
    csv += 'MONTHLY DATA\n';
    csv += 'Month,Revenue,Cost,Profit\n';
    monthlyData.forEach(item => {
      csv += `${item.month},${item.revenue},${item.cost},${item.profit}\n`;
    });
    csv += '\n';
    
    // Category data section
    csv += 'CATEGORY PROFIT\n';
    csv += 'Category,Profit\n';
    categoryData.forEach(item => {
      csv += `${item.name},${item.value}\n`;
    });
    csv += '\n';
    
    // Product performance section
    csv += 'PRODUCT PERFORMANCE\n';
    csv += 'Product ID,Product Name,Category,Units Sold,Cost Price,Selling Price,Total Revenue,Total Cost,Total Profit,Profit Margin\n';
    productPerformance.forEach(item => {
      csv += `${item.productId},${item.productName},${item.category},${item.unitsSold},${item.costPrice},${item.sellingPrice},${item.totalRevenue},${item.totalCost},${item.totalProfit},${item.profitMargin.toFixed(2)}%\n`;
    });

    return csv;
  }
}