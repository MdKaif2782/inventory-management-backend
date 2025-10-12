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
  StockMovementDto
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

    // Calculate net income from service orders in the current period
    const serviceItems = await this.databaseService.orderServiceItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      },
      select: {
        charge: true,
      },
    });

    const netIncomeFromService = serviceItems.reduce((sum, item) => sum + item.charge, 0);
    
    return {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      revenueChange,
      costChange,
      profitChange,
      marginChange,
      netIncomeFromService
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

      // 10. Total Stock Value
      this.databaseService.product.aggregate({
        where: { markDeleted: false },
        _sum: {
          quantity: true,
          purchasePrice: true
        }
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
        totalStockValue: (stockValue._sum.quantity || 0) * (stockValue._sum.purchasePrice || 0),
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
        const sales = await this.databaseService.sale.findMany({
          where: {
            createdAt: {
              gte: weekStart,
              lte: weekEnd
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });

        const revenue = sales.reduce((sum, sale) => {
          return sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        }, 0);

        const unitsSold = sales.reduce((sum, sale) => {
          return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);

        return {
          week: weekLabel,
          revenue,
          units: unitsSold,
          orders: sales.length
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
    
    const sales = await this.databaseService.sale.findMany({
      where: {
        createdAt: {
          gte: oneMonthAgo
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const productMap = new Map();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId) || {
          name: item.product.name,
          category: item.product.category,
          unitsSold: 0,
          revenue: 0
        };
        
        productMap.set(item.productId, {
          ...existing,
          unitsSold: existing.unitsSold + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity)
        });
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(product => ({
        ...product,
        growth: Math.random() * 50 - 25 // Placeholder for growth calculation
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
          this.databaseService.product.aggregate({
            where: {
              markDeleted: false,
              createdAt: { lte: monthEnd }
            },
            _sum: {
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
          stockValue: (stockValue._sum.quantity || 0) * (stockValue._sum.purchasePrice || 0),
          netChange: (inbound._sum.quantity || 0) - (outbound._sum.quantity || 0)
        };
      })
    ).then(results => results.reverse());
  }

  private async getSalesPerformance() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentSales, previousSales] = await Promise.all([
      this.databaseService.sale.findMany({
        where: {
          createdAt: { gte: currentMonthStart }
        },
        include: { items: { include: { product: true } } }
      }),
      this.databaseService.sale.findMany({
        where: {
          createdAt: { 
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        },
        include: { items: { include: { product: true } } }
      })
    ]);

    const currentRevenue = currentSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
    );

    const previousRevenue = previousSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
    );

    const revenueGrowth = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 
      currentRevenue > 0 ? 100 : 0;

    return {
      currentMonthRevenue: currentRevenue,
      previousMonthRevenue: previousRevenue,
      revenueGrowth,
      totalOrders: currentSales.length,
      averageOrderValue: currentSales.length > 0 ? currentRevenue / currentSales.length : 0
    };
  }

  private async getSalesPerformanceChart() {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now
    });

    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const sales = await this.databaseService.sale.findMany({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          },
          include: { items: { include: { product: true } } }
        });

        const revenue = sales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
        );

        const cost = sales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.product.purchasePrice * item.quantity), 0), 0
        );

        return {
          month: format(month, 'MMM yy'),
          revenue,
          cost,
          profit: revenue - cost,
          orders: sales.length
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
      end: now
    });

    const monthlyProfit = await Promise.all(
      months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const sales = await this.databaseService.sale.findMany({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          },
          include: { items: { include: { product: true } } }
        });

        const revenue = sales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
        );

        const cost = sales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.product.purchasePrice * item.quantity), 0), 0
        );

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
}