// report.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  ReportFilterDto,
  FinancialSummaryDto,
  MonthlyDataDto,
  CategoryDataDto,
  ProductPerformanceDto,
  DashboardSummaryDto,
  SalesTrendDto,
  StockMovementDto,
  SalesBreakdownDto,
  SalesChannelDataDto,
  BulkSalesSummaryDto,
  ServiceIncomeSummaryDto,
  EnhancedDashboardDto
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
  differenceInDays,
  endOfWeek,
  startOfWeek,
  subWeeks
} from 'date-fns';

// Color palette for charts
const CATEGORY_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
// Extended color palette for charts
const CHART_COLORS = {
  CATEGORY: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'],
  REVENUE: '#4CAF50',
  COST: '#F44336',
  PROFIT: '#2196F3',
  INBOUND: '#FF9800',
  OUTBOUND: '#9C27B0',
  STOCK: '#607D8B'
};

@Injectable()
export class ReportService {
  constructor(private databaseService: DatabaseService) { }

  async getFinancialSummary(filter: ReportFilterDto): Promise<FinancialSummaryDto> {
    const { start, end } = this.getDateRange(filter);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range');
    }

    const previousPeriod = this.getPreviousPeriod(start, end);

    // Get current period regular sales (retail)
    const currentRetailSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        saleType: 'REGULAR',
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Get current period bulk sales (from Sale model with saleType BULK)
    const currentBulkSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        saleType: 'BULK',
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Get service income from completed orders
    const serviceItems = await this.databaseService.orderServiceItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED',
        },
      },
      select: { charge: true },
    });

    // Get completed orders count
    const ordersCompleted = await this.databaseService.order.count({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED',
        NOT: {
          AND: [
            { phone: 'N/A' },
            { fullName: { startsWith: 'Sale SALE' } },
          ],
        },
      },
    });

    // Calculate retail sales metrics
    let retailRevenue = 0;
    let retailCost = 0;
    currentRetailSales.forEach(sale => {
      sale.items.forEach(item => {
        retailRevenue += item.price * item.quantity;
        retailCost += item.product.purchasePrice * item.quantity;
      });
    });

    // Calculate bulk sales metrics
    let bulkRevenue = 0;
    let bulkCost = 0;
    currentBulkSales.forEach(sale => {
      bulkRevenue += sale.total; // Already has discount applied
      sale.items.forEach(item => {
        bulkCost += item.product.purchasePrice * item.quantity;
      });
    });

    // Calculate service income
    const serviceIncome = serviceItems.reduce((sum, item) => sum + item.charge, 0);

    // Total calculations
    const totalRevenue = retailRevenue + bulkRevenue + serviceIncome;
    const totalCost = retailCost + bulkCost;
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get previous period data for comparison
    const [prevRetailSales, prevBulkSales, prevServiceItems] = await Promise.all([
      this.databaseService.sale.findMany({
        where: {
          createdAt: { gte: previousPeriod.start, lte: previousPeriod.end },
          saleType: 'REGULAR',
        },
        include: { items: { include: { product: true } } },
      }),
      this.databaseService.sale.findMany({
        where: {
          createdAt: { gte: previousPeriod.start, lte: previousPeriod.end },
          saleType: 'BULK',
        },
        include: { items: { include: { product: true } } },
      }),
      this.databaseService.orderServiceItem.findMany({
        where: {
          order: {
            createdAt: { gte: previousPeriod.start, lte: previousPeriod.end },
            status: 'COMPLETED',
          },
        },
        select: { charge: true },
      }),
    ]);

    let prevRetailRevenue = 0, prevRetailCost = 0;
    prevRetailSales.forEach(sale => {
      sale.items.forEach(item => {
        prevRetailRevenue += item.price * item.quantity;
        prevRetailCost += item.product.purchasePrice * item.quantity;
      });
    });

    let prevBulkRevenue = 0, prevBulkCost = 0;
    prevBulkSales.forEach(sale => {
      prevBulkRevenue += sale.total;
      sale.items.forEach(item => {
        prevBulkCost += item.product.purchasePrice * item.quantity;
      });
    });
    const prevServiceIncome = prevServiceItems.reduce((sum, item) => sum + item.charge, 0);

    const prevTotalRevenue = prevRetailRevenue + prevBulkRevenue + prevServiceIncome;
    const prevTotalCost = prevRetailCost + prevBulkCost;
    const prevNetProfit = prevTotalRevenue - prevTotalCost;
    const prevProfitMargin = prevTotalRevenue > 0 ? (prevNetProfit / prevTotalRevenue) * 100 : 0;

    // Calculate changes
    const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : totalRevenue > 0 ? 100 : 0;
    const costChange = prevTotalCost > 0 ? ((totalCost - prevTotalCost) / prevTotalCost) * 100 : totalCost > 0 ? 100 : 0;
    const profitChange = prevNetProfit > 0 ? ((netProfit - prevNetProfit) / prevNetProfit) * 100 : netProfit > 0 ? 100 : 0;
    const marginChange = profitMargin - prevProfitMargin;

    const salesBreakdown: SalesBreakdownDto = {
      retailSales: retailRevenue,
      bulkSales: bulkRevenue,
      serviceIncome,
      total: totalRevenue,
    };

    return {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      revenueChange,
      costChange,
      profitChange,
      marginChange,
      netIncomeFromService: serviceIncome,
      salesBreakdown,
      bulkSalesCount: currentBulkSales.length,
      retailSalesCount: currentRetailSales.length,
      ordersCompleted,
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

      // Get retail sales
      const retailSales = await this.databaseService.sale.findMany({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          saleType: 'REGULAR',
        },
        include: { items: { include: { product: true } } },
      });

      // Get bulk sales (from Sale model with saleType BULK)
      const bulkSales = await this.databaseService.sale.findMany({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          saleType: 'BULK',
        },
        include: { items: { include: { product: true } } },
      });

      // Get service income
      const serviceItems = await this.databaseService.orderServiceItem.findMany({
        where: {
          order: {
            createdAt: { gte: monthStart, lte: monthEnd },
            status: 'COMPLETED',
          },
        },
        select: { charge: true },
      });

      let retailRevenue = 0, retailCost = 0;
      retailSales.forEach(sale => {
        sale.items.forEach(item => {
          retailRevenue += item.price * item.quantity;
          retailCost += item.product.purchasePrice * item.quantity;
        });
      });

      let bulkRevenue = 0, bulkCost = 0;
      bulkSales.forEach(sale => {
        bulkRevenue += sale.total;
        sale.items.forEach(item => {
          bulkCost += item.product.purchasePrice * item.quantity;
        });
      });
      const serviceIncome = serviceItems.reduce((sum, item) => sum + item.charge, 0);

      const revenue = retailRevenue + bulkRevenue + serviceIncome;
      const cost = retailCost + bulkCost;

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

    // Get retail sales
    const retailSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        saleType: 'REGULAR',
      },
      include: { items: { include: { product: true } } },
    });

    // Get bulk sales with items (from Sale model with saleType BULK)
    const bulkSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        saleType: 'BULK',
      },
      include: { items: { include: { product: true } } },
    });

    const categoryMap = new Map<string, number>();

    // Process retail sales
    retailSales.forEach(sale => {
      sale.items.forEach(item => {
        const category = item.product.category;
        const profit = (item.price - item.product.purchasePrice) * item.quantity;
        categoryMap.set(category, (categoryMap.get(category) || 0) + profit);
      });
    });

    // Process bulk sales
    bulkSales.forEach(sale => {
      sale.items.forEach(item => {
        const category = item.product.category;
        const profit = (item.price - item.product.purchasePrice) * item.quantity;
        categoryMap.set(category, (categoryMap.get(category) || 0) + profit);
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

    // Get retail sales
    const retailSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        saleType: 'REGULAR',
      },
      include: { items: { include: { product: true } } },
    });

    // Get bulk sales (from Sale model with saleType BULK)
    const bulkSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        saleType: 'BULK',
      },
      include: { items: { include: { product: true } } },
    });

    const productMap = new Map<string, ProductPerformanceDto>();

    const processItem = (item: any, product: any) => {
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
    };

    // Process retail sales
    retailSales.forEach(sale => {
      sale.items.forEach(item => processItem(item, item.product));
    });

    // Process bulk sales
    bulkSales.forEach(sale => {
      sale.items.forEach(item => processItem(item, item.product));
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

    // Sales Breakdown section
    csv += 'SALES BREAKDOWN\n';
    csv += 'Channel,Revenue\n';
    csv += `Retail Sales,${summary.salesBreakdown.retailSales}\n`;
    csv += `Bulk Sales,${summary.salesBreakdown.bulkSales}\n`;
    csv += `Service Income,${summary.salesBreakdown.serviceIncome}\n`;
    csv += `Total,${summary.salesBreakdown.total}\n\n`;

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

  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));

    // Execute all queries in parallel for better performance
    const [
      totalProducts,
      lowStockAlerts,
      monthlyInbound,
      monthlyOutbound,
      weeklySales,
      categoryDistribution,
      topSellingProducts,
      lowStockItems,
      recentActivity,
      stockValue
    ] = await Promise.all([
      // 1. Total Products Count
      this.databaseService.product.count({
        where: { markDeleted: false }
      }),

      // 2. Low Stock Alerts Count
      this.databaseService.product.count({
        where: {
          markDeleted: false,
          quantity: { lte: 10 }
        }
      }),

      // 3. Monthly Inbound - Updated to handle optional product
      this.databaseService.inventoryLog.aggregate({
        where: {
          type: { in: ['IN', 'ADDED'] },
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        },
        _sum: { quantity: true }
      }),

      // 4. Monthly Outbound - Updated to handle optional product
      this.databaseService.inventoryLog.aggregate({
        where: {
          type: 'OUT',
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        },
        _sum: { quantity: true }
      }),

      // 5. Weekly Sales Trend
      this.getWeeklySalesTrend(),

      // 6. Category Distribution (Pie Chart Data)
      this.getCategoryDistribution(),

      // 7. Top Selling Products
      this.getTopSellingProducts(5),

      // 8. Low Stock Items
      this.databaseService.product.findMany({
        where: {
          markDeleted: false,
          quantity: { lte: 10 }
        },
        select: {
          name: true,
          category: true,
          quantity: true,
          purchasePrice: true
        },
        orderBy: { quantity: 'asc' },
        take: 5
      }),

      // 9. Recent Activity - Updated to handle optional product
      this.databaseService.inventoryLog.findMany({
        include: {
          product: { 
            select: { name: true } 
          },
          user: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 6
      }),

      // 10. Total Stock Value - fetch individual products to correctly compute quantity * price per product
      this.databaseService.product.findMany({
        where: { markDeleted: false },
        select: { quantity: true, purchasePrice: true }
      })
    ]);

    // 11. Stock Movement (Last 6 months) - More detailed
    const stockMovement = await this.getStockMovement(6);

    // 12. Sales Performance Metrics
    const salesPerformance = await this.getSalesPerformance();

    return {
      summaryCards: {
        totalProducts,
        lowStockAlerts,
        monthlyInbound: monthlyInbound._sum.quantity || 0,
        monthlyOutbound: monthlyOutbound._sum.quantity || 0,
        totalStockValue: stockValue.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0),
        monthlyRevenue: salesPerformance.currentMonthRevenue
      },
      charts: {
        stockMovement,
        weeklySalesTrend: weeklySales,
        categoryDistribution,
        salesPerformance: await this.getSalesPerformanceChart(),
        inventoryHealth: await this.getInventoryHealthChart(),
        profitTrend: await this.getProfitTrendChart()
      },
      topSellingProducts: topSellingProducts.map(product => ({
        name: product.name,
        category: product.category,
        unitsSold: product.unitsSold,
        revenue: product.revenue,
        growth: product.growth
      })),
      lowStockItems: lowStockItems.map(item => ({
        name: item.name,
        category: item.category,
        current: item.quantity,
        threshold: 10,
        value: item.quantity * item.purchasePrice
      })),
      // Updated to handle optional product
      recentActivity: recentActivity.map(log => ({
        type: log.type,
        product: log.product?.name || 'Unknown Product', // Handle null product
        quantity: log.quantity || 0,
        user: log.user.fullName,
        time: this.formatTimeAgo(log.createdAt),
        timestamp: log.createdAt
      }))
    };
  }

  private async getWeeklySalesTrend(): Promise<SalesTrendDto[]> {
    const now = new Date();
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = endOfWeek(subWeeks(now, i));
      return { weekStart, weekEnd, weekLabel: `Week ${8 - i}` };
    }).reverse();

    const weeklyData = await Promise.all(
      weeks.map(async ({ weekStart, weekEnd, weekLabel }) => {
        // Get retail sales
        const retailSales = await this.databaseService.sale.findMany({
          where: {
            createdAt: { gte: weekStart, lte: weekEnd },
            saleType: 'REGULAR',
          },
          include: { items: { include: { product: true } } },
        });

        // Get bulk sales (from Sale model with saleType BULK)
        const bulkSales = await this.databaseService.sale.findMany({
          where: {
            createdAt: { gte: weekStart, lte: weekEnd },
            saleType: 'BULK',
          },
        });

        // Get service income
        const serviceItems = await this.databaseService.orderServiceItem.findMany({
          where: {
            order: {
              createdAt: { gte: weekStart, lte: weekEnd },
              status: 'COMPLETED',
            },
          },
          select: { charge: true },
        });

        const retailRevenue = retailSales.reduce((sum, sale) => {
          return sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        }, 0);

        const bulkRevenue = bulkSales.reduce((sum, sale) => sum + sale.total, 0);
        const serviceRevenue = serviceItems.reduce((sum, item) => sum + item.charge, 0);

        const unitsSold = retailSales.reduce((sum, sale) => {
          return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);

        return {
          week: weekLabel,
          revenue: retailRevenue + bulkRevenue + serviceRevenue,
          units: unitsSold,
          orders: retailSales.length + bulkSales.length,
        };
      })
    );

    return weeklyData;
  }

  private async getCategoryDistribution() {
    const products = await this.databaseService.product.findMany({
      where: { markDeleted: false },
      select: {
        category: true,
        quantity: true,
        purchasePrice: true
      }
    });

    const categoryMap = new Map();
    
    products.forEach(product => {
      const current = categoryMap.get(product.category) || { count: 0, value: 0 };
      categoryMap.set(product.category, {
        count: current.count + 1,
        value: current.value + (product.quantity * product.purchasePrice)
      });
    });

    let colorIndex = 0;
    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value,
      color: CHART_COLORS.CATEGORY[colorIndex++ % CHART_COLORS.CATEGORY.length]
    }));
  }

  private async getTopSellingProducts(limit: number = 5) {
    const oneMonthAgo = subMonths(new Date(), 1);
    
    // Get retail sales
    const retailSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: oneMonthAgo },
        saleType: 'REGULAR',
      },
      include: { items: { include: { product: true } } },
    });

    // Get bulk sales (from Sale model with saleType BULK)
    const bulkSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: oneMonthAgo },
        saleType: 'BULK',
      },
      include: { items: { include: { product: true } } },
    });

    const productMap = new Map();

    // Process retail sales
    retailSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId) || {
          name: item.product.name,
          category: item.product.category,
          unitsSold: 0,
          revenue: 0,
        };
        productMap.set(item.productId, {
          ...existing,
          unitsSold: existing.unitsSold + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity),
        });
      });
    });

    // Process bulk sales
    bulkSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId) || {
          name: item.product.name,
          category: item.product.category,
          unitsSold: 0,
          revenue: 0,
        };
        productMap.set(item.productId, {
          ...existing,
          unitsSold: existing.unitsSold + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity),
        });
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(product => ({
        ...product,
        growth: Math.random() * 50 - 25, // Placeholder for growth calculation
      }));
  }

  private async getStockMovement(months: number = 6): Promise<StockMovementDto[]> {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return await Promise.all(
      Array.from({ length: months }, async (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const [inbound, outbound, stockValue] = await Promise.all([
          // Updated to handle optional product
          this.databaseService.inventoryLog.aggregate({
            where: {
              type: { in: ['IN', 'ADDED'] },
              createdAt: { gte: monthStart, lte: monthEnd }
            },
            _sum: { quantity: true }
          }),
          // Updated to handle optional product
          this.databaseService.inventoryLog.aggregate({
            where: {
              type: 'OUT',
              createdAt: { gte: monthStart, lte: monthEnd }
            },
            _sum: { quantity: true }
          }),
          this.databaseService.product.findMany({
            where: {
              markDeleted: false,
              createdAt: { lte: monthEnd }
            },
            select: {
              quantity: true,
              purchasePrice: true
            }
          })
        ]);

        return {
          month: monthNames[monthStart.getMonth()],
          year: monthStart.getFullYear(),
          inbound: inbound._sum.quantity || 0,
          outbound: outbound._sum.quantity || 0,
          stockValue: stockValue.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0),
          netChange: (inbound._sum.quantity || 0) - (outbound._sum.quantity || 0)
        };
      })
    ).then(results => results.reverse());
  }

  private async getSalesPerformance() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current period data
    const [currentRetailSales, currentBulkSales, currentServiceItems, prevRetailSales, prevBulkSales, prevServiceItems] = await Promise.all([
      this.databaseService.sale.findMany({
        where: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd }, saleType: 'REGULAR' },
        include: { items: { include: { product: true } } },
      }),
      this.databaseService.sale.findMany({
        where: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd }, saleType: 'BULK' },
      }),
      this.databaseService.orderServiceItem.findMany({
        where: { order: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd }, status: 'COMPLETED' } },
        select: { charge: true },
      }),
      this.databaseService.sale.findMany({
        where: { createdAt: { gte: previousMonthStart, lte: previousMonthEnd }, saleType: 'REGULAR' },
        include: { items: { include: { product: true } } },
      }),
      this.databaseService.sale.findMany({
        where: { createdAt: { gte: previousMonthStart, lte: previousMonthEnd }, saleType: 'BULK' },
      }),
      this.databaseService.orderServiceItem.findMany({
        where: { order: { createdAt: { gte: previousMonthStart, lte: previousMonthEnd }, status: 'COMPLETED' } },
        select: { charge: true },
      }),
    ]);

    const currentRetailRevenue = currentRetailSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
    );
    const currentBulkRevenue = currentBulkSales.reduce((sum, sale) => sum + sale.total, 0);
    const currentServiceRevenue = currentServiceItems.reduce((sum, item) => sum + item.charge, 0);
    const currentRevenue = currentRetailRevenue + currentBulkRevenue + currentServiceRevenue;

    const previousRetailRevenue = prevRetailSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
    );
    const previousBulkRevenue = prevBulkSales.reduce((sum, sale) => sum + sale.total, 0);
    const previousServiceRevenue = prevServiceItems.reduce((sum, item) => sum + item.charge, 0);
    const previousRevenue = previousRetailRevenue + previousBulkRevenue + previousServiceRevenue;

    const revenueGrowth = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 
      currentRevenue > 0 ? 100 : 0;

    const totalOrders = currentRetailSales.length + currentBulkSales.length;

    return {
      currentMonthRevenue: currentRevenue,
      previousMonthRevenue: previousRevenue,
      revenueGrowth,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? currentRevenue / totalOrders : 0,
    };
  }

  private async getSalesPerformanceChart() {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now,
    });

    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        // Get retail sales
        const retailSales = await this.databaseService.sale.findMany({
          where: { createdAt: { gte: monthStart, lte: monthEnd }, saleType: 'REGULAR' },
          include: { items: { include: { product: true } } },
        });

        // Get bulk sales (from Sale model with saleType BULK)
        const bulkSales = await this.databaseService.sale.findMany({
          where: { createdAt: { gte: monthStart, lte: monthEnd }, saleType: 'BULK' },
          include: { items: { include: { product: true } } },
        });

        // Get service income
        const serviceItems = await this.databaseService.orderServiceItem.findMany({
          where: { order: { createdAt: { gte: monthStart, lte: monthEnd }, status: 'COMPLETED' } },
          select: { charge: true },
        });

        const retailRevenue = retailSales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
        );
        const retailCost = retailSales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.product.purchasePrice * item.quantity), 0), 0
        );

        let bulkRevenue = 0, bulkCost = 0;
        bulkSales.forEach(sale => {
          bulkRevenue += sale.total;
          sale.items.forEach(item => {
            bulkCost += item.product.purchasePrice * item.quantity;
          });
        });
        const serviceRevenue = serviceItems.reduce((sum, item) => sum + item.charge, 0);

        const revenue = retailRevenue + bulkRevenue + serviceRevenue;
        const cost = retailCost + bulkCost;

        return {
          month: format(month, 'MMM yy'),
          revenue,
          cost,
          profit: revenue - cost,
          orders: retailSales.length + bulkSales.length,
        };
      })
    );

    return monthlyData;
  }

  private async getInventoryHealthChart() {
    const products = await this.databaseService.product.findMany({
      where: { markDeleted: false },
      select: {
        quantity: true,
      }
    });

    const healthStatus = {
      healthy: 0,     // Above min stock level
      warning: 0,     // At min stock level
      critical: 0,    // Below min stock level
      outOfStock: 0   // Zero stock
    };

    products.forEach(product => {
      if (product.quantity === 0) {
        healthStatus.outOfStock++;
      } else if (product.quantity < 5) {
        healthStatus.critical++;
      } else if (product.quantity === 5) {
        healthStatus.warning++;
      } else {
        healthStatus.healthy++;
      }
    });

    return [
      { name: 'Healthy', value: healthStatus.healthy, color: '#4CAF50' },
      { name: 'Warning', value: healthStatus.warning, color: '#FFC107' },
      { name: 'Critical', value: healthStatus.critical, color: '#FF9800' },
      { name: 'Out of Stock', value: healthStatus.outOfStock, color: '#F44336' }
    ];
  }

  private async getProfitTrendChart() {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now,
    });

    const monthlyProfit = await Promise.all(
      months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        // Get retail sales
        const retailSales = await this.databaseService.sale.findMany({
          where: { createdAt: { gte: monthStart, lte: monthEnd }, saleType: 'REGULAR' },
          include: { items: { include: { product: true } } },
        });

        // Get bulk sales (from Sale model with saleType='BULK')
        const bulkSales = await this.databaseService.sale.findMany({
          where: { createdAt: { gte: monthStart, lte: monthEnd }, saleType: 'BULK' },
          include: { items: { include: { product: true } } },
        });

        // Get service income
        const serviceItems = await this.databaseService.orderServiceItem.findMany({
          where: { order: { createdAt: { gte: monthStart, lte: monthEnd }, status: 'COMPLETED' } },
          select: { charge: true },
        });

        const retailRevenue = retailSales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
        );
        const retailCost = retailSales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.product.purchasePrice * item.quantity), 0), 0
        );

        const bulkRevenue = bulkSales.reduce((sum, sale) => sum + sale.total, 0);
        const bulkCost = bulkSales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.product.purchasePrice * item.quantity), 0), 0
        );
        const serviceRevenue = serviceItems.reduce((sum, item) => sum + item.charge, 0);

        const revenue = retailRevenue + bulkRevenue + serviceRevenue;
        const cost = retailCost + bulkCost;

        return {
          month: format(month, 'MMM yy'),
          profit: revenue - cost,
          margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
        };
      })
    );

    return monthlyProfit;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
      }
    }

    return 'Just now';
  }

  // ==================== NEW METHODS FOR ENHANCED REPORTING ====================

  async getSalesChannelDistribution(filter?: ReportFilterDto): Promise<SalesChannelDataDto[]> {
    const now = new Date();
    const monthStart = filter?.startDate ? new Date(filter.startDate) : startOfMonth(now);
    const monthEnd = filter?.endDate ? new Date(filter.endDate) : endOfMonth(now);

    // Get retail sales
    const retailSales = await this.databaseService.sale.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        saleType: 'REGULAR',
      },
      include: { items: { include: { product: true } } },
    });

    let retailRevenue = 0, retailCost = 0;
    retailSales.forEach(sale => {
      sale.items.forEach(item => {
        retailRevenue += item.price * item.quantity;
        retailCost += item.product.purchasePrice * item.quantity;
      });
    });

    // Get bulk sales (from Sale model with saleType='BULK')
    const bulkSales = await this.databaseService.sale.findMany({
      where: { 
        createdAt: { gte: monthStart, lte: monthEnd },
        saleType: 'BULK',
      },
      include: { items: { include: { product: true } } },
    });

    let bulkRevenue = 0, bulkCost = 0;
    bulkSales.forEach(sale => {
      bulkRevenue += sale.total;
      sale.items.forEach(item => {
        bulkCost += item.product.purchasePrice * item.quantity;
      });
    });

    // Get service income
    const serviceItems = await this.databaseService.orderServiceItem.findMany({
      where: {
        order: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'COMPLETED',
        },
      },
      select: { charge: true },
    });

    const serviceIncome = serviceItems.reduce((sum, item) => sum + item.charge, 0);

    return [
      {
        channel: 'retail',
        revenue: retailRevenue,
        cost: retailCost,
        profit: retailRevenue - retailCost,
        count: retailSales.length,
        color: '#4CAF50',
      },
      {
        channel: 'bulk',
        revenue: bulkRevenue,
        cost: bulkCost,
        profit: bulkRevenue - bulkCost,
        count: bulkSales.length,
        color: '#2196F3',
      },
      {
        channel: 'service',
        revenue: serviceIncome,
        cost: 0,
        profit: serviceIncome,
        count: serviceItems.length,
        color: '#FF9800',
      },
    ];
  }

  async getBulkSalesSummary(filter?: ReportFilterDto): Promise<BulkSalesSummaryDto> {
    const now = new Date();
    const monthStart = filter?.startDate ? new Date(filter.startDate) : startOfMonth(now);
    const monthEnd = filter?.endDate ? new Date(filter.endDate) : endOfMonth(now);

    // Get bulk sales from Sale model (saleType='BULK')
    const bulkSales = await this.databaseService.sale.findMany({
      where: { 
        createdAt: { gte: monthStart, lte: monthEnd },
        saleType: 'BULK',
      },
      include: { 
        items: { include: { product: true } },
        cashier: { select: { fullName: true } },
      },
    });

    let totalRevenue = 0, totalCost = 0, totalDiscount = 0;
    bulkSales.forEach(sale => {
      totalRevenue += sale.total;
      totalDiscount += sale.discountAmount || 0;
      sale.items.forEach(item => {
        totalCost += item.product.purchasePrice * item.quantity;
      });
    });
    const totalProfit = totalRevenue - totalCost;

    // Group by company name
    const customerMap = new Map<string, { totalPurchases: number; revenue: number }>();
    bulkSales.forEach(sale => {
      const customerName = sale.companyName || 'Unknown';
      const existing = customerMap.get(customerName) || { totalPurchases: 0, revenue: 0 };
      customerMap.set(customerName, {
        totalPurchases: existing.totalPurchases + 1,
        revenue: existing.revenue + sale.total,
      });
    });

    const topCompanies = Array.from(customerMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalDiscount,
      salesCount: bulkSales.length,
      topCompanies,
    };
  }

  async getServiceIncomeSummary(filter?: ReportFilterDto): Promise<ServiceIncomeSummaryDto> {
    const now = new Date();
    const monthStart = filter?.startDate ? new Date(filter.startDate) : startOfMonth(now);
    const monthEnd = filter?.endDate ? new Date(filter.endDate) : endOfMonth(now);

    const serviceItems = await this.databaseService.orderServiceItem.findMany({
      where: {
        order: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'COMPLETED',
          NOT: {
            AND: [
              { phone: 'N/A' },
              { fullName: { startsWith: 'Sale SALE' } },
            ],
          },
        },
      },
      select: { description: true, charge: true },
    });

    const completedOrders = await this.databaseService.order.count({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: 'COMPLETED',
        NOT: {
          AND: [
            { phone: 'N/A' },
            { fullName: { startsWith: 'Sale SALE' } },
          ],
        },
      },
    });

    const totalIncome = serviceItems.reduce((sum, item) => sum + item.charge, 0);
    const averageChargePerOrder = completedOrders > 0 ? totalIncome / completedOrders : 0;

    // Group by service description
    const serviceMap = new Map<string, { totalCharge: number; count: number }>();
    serviceItems.forEach(item => {
      const existing = serviceMap.get(item.description) || { totalCharge: 0, count: 0 };
      serviceMap.set(item.description, {
        totalCharge: existing.totalCharge + item.charge,
        count: existing.count + 1,
      });
    });

    const topServices = Array.from(serviceMap.entries())
      .map(([description, data]) => ({ description, ...data }))
      .sort((a, b) => b.totalCharge - a.totalCharge)
      .slice(0, 5);

    return {
      totalIncome,
      ordersCount: completedOrders,
      averageChargePerOrder,
      topServices,
    };
  }

  async getMonthlyRevenueByChannel(months: number = 6) {
    const now = new Date();
    const monthsInterval = eachMonthOfInterval({
      start: subMonths(now, months - 1),
      end: now,
    });

    return Promise.all(
      monthsInterval.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        // Retail sales
        const retailSales = await this.databaseService.sale.findMany({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            saleType: 'REGULAR',
          },
          include: { items: true },
        });
        const retailRevenue = retailSales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
        );

        // Bulk sales (from Sale model with saleType='BULK')
        const bulkSales = await this.databaseService.sale.findMany({
          where: { 
            createdAt: { gte: monthStart, lte: monthEnd },
            saleType: 'BULK',
          },
        });
        const bulkRevenue = bulkSales.reduce((sum, sale) => sum + sale.total, 0);

        // Service income
        const serviceItems = await this.databaseService.orderServiceItem.findMany({
          where: {
            order: {
              createdAt: { gte: monthStart, lte: monthEnd },
              status: 'COMPLETED',
            },
          },
          select: { charge: true },
        });
        const serviceRevenue = serviceItems.reduce((sum, item) => sum + item.charge, 0);

        return {
          month: format(month, 'MMM yy'),
          retail: retailRevenue,
          bulk: bulkRevenue,
          service: serviceRevenue,
          total: retailRevenue + bulkRevenue + serviceRevenue,
        };
      })
    );
  }

  async getRecentBulkSales(limit: number = 5) {
    return this.databaseService.sale.findMany({
      where: { saleType: 'BULK' },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        cashier: { select: { fullName: true, staffId: true } },
        items: {
          take: 3,
          include: { product: { select: { name: true, purchasePrice: true } } },
        },
      },
    });
  }

  async getRecentOrders(limit: number = 5) {
    return this.databaseService.order.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
        NOT: {
          AND: [
            { phone: 'N/A' },
            { fullName: { startsWith: 'Sale SALE' } },
          ],
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        serviceSold: true,
        productSold: { select: { name: true, salePrice: true } },
      },
    });
  }

  async getEnhancedDashboard(): Promise<EnhancedDashboardDto> {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Execute all queries in parallel
    const [
      totalProducts,
      lowStockAlerts,
      monthlyInbound,
      monthlyOutbound,
      weeklySales,
      categoryDistribution,
      topSellingProducts,
      lowStockItems,
      recentActivity,
      stockValue,
      salesPerformance,
      salesChannelDistribution,
      monthlyRevenueByChannel,
      bulkSalesSummary,
      serviceIncomeSummary,
      recentBulkSales,
      recentOrders,
    ] = await Promise.all([
      this.databaseService.product.count({ where: { markDeleted: false } }),
      this.databaseService.product.count({ where: { markDeleted: false, quantity: { lte: 10 } } }),
      this.databaseService.inventoryLog.aggregate({
        where: { type: { in: ['IN', 'ADDED'] }, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } },
        _sum: { quantity: true },
      }),
      this.databaseService.inventoryLog.aggregate({
        where: { type: 'OUT', createdAt: { gte: currentMonthStart, lte: currentMonthEnd } },
        _sum: { quantity: true },
      }),
      this.getWeeklySalesTrend(),
      this.getCategoryDistribution(),
      this.getTopSellingProducts(5),
      this.databaseService.product.findMany({
        where: { markDeleted: false, quantity: { lte: 10 } },
        select: { name: true, category: true, quantity: true, purchasePrice: true },
        orderBy: { quantity: 'asc' },
        take: 5,
      }),
      this.databaseService.inventoryLog.findMany({
        include: { product: { select: { name: true } }, user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.databaseService.product.findMany({
        where: { markDeleted: false },
        select: { quantity: true, purchasePrice: true },
      }),
      this.getSalesPerformance(),
      this.getSalesChannelDistribution(),
      this.getMonthlyRevenueByChannel(6),
      this.getBulkSalesSummary(),
      this.getServiceIncomeSummary(),
      this.getRecentBulkSales(5),
      this.getRecentOrders(5),
    ]);

    // Calculate monthly profit from all channels
    const monthlyProfit = salesChannelDistribution.reduce((sum, ch) => sum + ch.profit, 0);
    const totalRetailSales = salesChannelDistribution.find(ch => ch.channel === 'retail')?.revenue || 0;
    const totalBulkSales = salesChannelDistribution.find(ch => ch.channel === 'bulk')?.revenue || 0;
    const totalServiceIncome = salesChannelDistribution.find(ch => ch.channel === 'service')?.revenue || 0;

    // Stock movement fetched separately (requires sequential month-by-month queries)
    const stockMovement = await this.getStockMovement(6);

    return {
      summaryCards: {
        totalProducts,
        lowStockAlerts,
        monthlyInbound: monthlyInbound._sum.quantity || 0,
        monthlyOutbound: monthlyOutbound._sum.quantity || 0,
        totalStockValue: stockValue.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0),
        monthlyRevenue: salesPerformance.currentMonthRevenue,
        monthlyProfit,
        totalRetailSales,
        totalBulkSales,
        totalServiceIncome,
      },
      charts: {
        stockMovement,
        weeklySalesTrend: weeklySales,
        categoryDistribution,
        salesPerformance: await this.getSalesPerformanceChart(),
        inventoryHealth: await this.getInventoryHealthChart(),
        profitTrend: await this.getProfitTrendChart(),
        salesChannelDistribution,
        monthlyRevenueByChannel,
      },
      topSellingProducts: topSellingProducts.map(product => ({
        name: product.name,
        category: product.category,
        unitsSold: product.unitsSold,
        revenue: product.revenue,
        growth: product.growth,
      })),
      lowStockItems: lowStockItems.map(item => ({
        name: item.name,
        category: item.category,
        current: item.quantity,
        threshold: 10,
        value: item.quantity * item.purchasePrice,
      })),
      recentActivity: recentActivity.map(log => ({
        type: log.type,
        product: log.product?.name || 'Unknown Product',
        quantity: log.quantity || 0,
        user: log.user.fullName,
        time: this.formatTimeAgo(log.createdAt),
        timestamp: log.createdAt,
      })),
      bulkSalesSummary,
      serviceIncomeSummary,
      recentBulkSales: recentBulkSales.map(sale => {
        const cost = sale.items.reduce((sum, item) => 
          sum + (item.product as any).purchasePrice * item.quantity, 0
        );
        return {
          id: sale.id,
          saleId: sale.saleId,
          companyName: sale.companyName,
          total: sale.total,
          profit: sale.total - cost,
          cashier: sale.cashier.fullName,
          createdAt: sale.createdAt,
          itemsPreview: sale.items.map(item => item.product.name),
        };
      }),
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        fullName: order.fullName,
        orderType: order.orderType,
        status: order.status,
        createdAt: order.createdAt,
        serviceCount: order.serviceSold.length,
        productCount: order.productSold.length,
        totalServiceCharge: order.serviceSold.reduce((sum, s) => sum + s.charge, 0),
      })),
    };
  }
}