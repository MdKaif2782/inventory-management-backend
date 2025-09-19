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