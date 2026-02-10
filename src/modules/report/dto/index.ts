import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportFilterDto {
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  @IsIn(['day', 'week', 'month', 'quarter', 'year', 'custom'])
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

  @IsOptional()
  @IsString()
  category?: string;
}

export class SalesBreakdownDto {
  retailSales: number;       // Regular POS sales
  bulkSales: number;         // Bulk/wholesale sales
  serviceIncome: number;     // Service charges from orders
  total: number;
}

export class FinancialSummaryDto {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  revenueChange: number;
  costChange: number;
  profitChange: number;
  marginChange: number;
  netIncomeFromService: number;
  // Enhanced breakdown
  salesBreakdown: SalesBreakdownDto;
  bulkSalesCount: number;
  retailSalesCount: number;
  ordersCompleted: number;
}

export class MonthlyDataDto {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

export class CategoryDataDto {
  name: string;
  value: number;
  color: string;
}

export class ProductPerformanceDto {
  productId: string;
  productName: string;
  category: string;
  unitsSold: number;
  costPrice: number;
  sellingPrice: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

// dto/index.ts
export class DashboardSummaryDto {
  summaryCards: {
    totalProducts: number;
    lowStockAlerts: number;
    monthlyInbound: number;
    monthlyOutbound: number;
    totalStockValue: number;
    monthlyRevenue: number;
  };

  charts: {
    stockMovement: StockMovementDto[];
    weeklySalesTrend: SalesTrendDto[];
    categoryDistribution: any[];
    salesPerformance: any[];
    inventoryHealth: any[];
    profitTrend: any[];
  };

  topSellingProducts: TopProductDto[];
  lowStockItems: LowStockItemDto[];
  recentActivity: RecentActivityDto[];
}

export class StockMovementDto {
  month: string;
  year: number;
  inbound: number;
  outbound: number;
  stockValue: number;
  netChange: number;
}

export class SalesTrendDto {
  week: string;
  revenue: number;
  units: number;
  orders: number;
}

export class TopProductDto {
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  growth: number;
}

export class LowStockItemDto {
  name: string;
  category: string;
  current: number;
  threshold: number;
  value: number;
}

export class RecentActivityDto {
  type: string;
  product: string;
  quantity: number;
  user: string;
  time: string;
  timestamp: Date;
}

// Enhanced Sales Analytics DTOs
export class SalesChannelDataDto {
  channel: 'retail' | 'bulk' | 'service';
  revenue: number;
  cost: number;
  profit: number;
  count: number;
  color: string;
}

export class BulkSalesSummaryDto {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalDiscount: number;
  salesCount: number;
  topCompanies: { name: string; totalPurchases: number; revenue: number }[];
}

export class ServiceIncomeSummaryDto {
  totalIncome: number;
  ordersCount: number;
  averageChargePerOrder: number;
  topServices: { description: string; totalCharge: number; count: number }[];
}

export class SalaryExpenseSummaryDto {
  totalPaid: number;
  totalCash: number;
  totalBank: number;
  employeeCount: number;
  pendingPayments: number;
  monthlyBreakdown: { month: string; year: number; amount: number }[];
}

export class EnhancedDashboardDto {
  summaryCards: {
    totalProducts: number;
    lowStockAlerts: number;
    monthlyInbound: number;
    monthlyOutbound: number;
    totalStockValue: number;
    monthlyRevenue: number;
    // New cards
    monthlyProfit: number;
    totalRetailSales: number;
    totalBulkSales: number;
    totalServiceIncome: number;
  };

  charts: {
    stockMovement: StockMovementDto[];
    weeklySalesTrend: SalesTrendDto[];
    categoryDistribution: any[];
    salesPerformance: any[];
    inventoryHealth: any[];
    profitTrend: any[];
    // New charts
    salesChannelDistribution: SalesChannelDataDto[];
    monthlyRevenueByChannel: any[];
  };

  topSellingProducts: TopProductDto[];
  lowStockItems: LowStockItemDto[];
  recentActivity: RecentActivityDto[];
  
  // New sections
  bulkSalesSummary: BulkSalesSummaryDto;
  serviceIncomeSummary: ServiceIncomeSummaryDto;
  recentBulkSales: any[];
  recentOrders: any[];
}