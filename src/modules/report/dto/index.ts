export class ReportFilterDto {
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  category?: string;
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
  netIncomeFromService: number
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

// ... Keep your existing DTOs