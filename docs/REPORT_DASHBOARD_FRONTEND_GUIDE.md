# Report & Dashboard API - Frontend Integration Guide

This document provides complete API specifications for integrating the enhanced Report and Dashboard endpoints into the frontend application.

---

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [API Endpoints](#api-endpoints)
4. [TypeScript Interfaces](#typescript-interfaces)
5. [Usage Examples](#usage-examples)

---

## Overview

The reporting system now tracks **all sales channels**:
- **Retail Sales** - Regular POS checkout transactions
- **Bulk Sales** - Wholesale/company sales
- **Service Income** - From completed customer orders

All endpoints use the common filter query parameters for date range filtering.

---

## Base URL

```
GET /reports/*
```

---

## API Endpoints

### 1. Financial Summary

**Endpoint:** `GET /reports/summary`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | `day`, `week`, `month`, `quarter`, `year`, `custom` |
| `startDate` | string (ISO) | No | Start date for custom period |
| `endDate` | string (ISO) | No | End date for custom period |
| `category` | string | No | Filter by product category |

**Response:**
```typescript
interface FinancialSummaryResponse {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;           // Percentage
  revenueChange: number;          // Percentage change from previous period
  costChange: number;
  profitChange: number;
  marginChange: number;
  netIncomeFromService: number;
  salesBreakdown: {
    retailSales: number;
    bulkSales: number;
    serviceIncome: number;
    total: number;
  };
  bulkSalesCount: number;
  retailSalesCount: number;
  ordersCompleted: number;
}
```

---

### 2. Basic Dashboard

**Endpoint:** `GET /reports/dashboard`

**Response:**
```typescript
interface DashboardSummaryResponse {
  summaryCards: {
    totalProducts: number;
    lowStockAlerts: number;
    monthlyInbound: number;
    monthlyOutbound: number;
    totalStockValue: number;
    monthlyRevenue: number;
  };
  charts: {
    stockMovement: StockMovementData[];
    weeklySalesTrend: SalesTrendData[];
    categoryDistribution: CategoryData[];
    salesPerformance: SalesPerformanceData[];
    inventoryHealth: InventoryHealthData[];
    profitTrend: ProfitTrendData[];
  };
  topSellingProducts: TopProductData[];
  lowStockItems: LowStockItemData[];
  recentActivity: RecentActivityData[];
}
```

---

### 3. Enhanced Dashboard (Recommended)

**Endpoint:** `GET /reports/dashboard/enhanced`

This is the **recommended endpoint** for a complete dashboard view with all sales channels.

**Response:**
```typescript
interface EnhancedDashboardResponse {
  summaryCards: {
    totalProducts: number;
    lowStockAlerts: number;
    monthlyInbound: number;
    monthlyOutbound: number;
    totalStockValue: number;
    monthlyRevenue: number;
    // NEW fields
    monthlyProfit: number;
    totalRetailSales: number;
    totalBulkSales: number;
    totalServiceIncome: number;
  };
  
  charts: {
    stockMovement: StockMovementData[];
    weeklySalesTrend: SalesTrendData[];
    categoryDistribution: CategoryData[];
    salesPerformance: SalesPerformanceData[];
    inventoryHealth: InventoryHealthData[];
    profitTrend: ProfitTrendData[];
    // NEW charts
    salesChannelDistribution: SalesChannelData[];
    monthlyRevenueByChannel: MonthlyRevenueByChannelData[];
  };
  
  topSellingProducts: TopProductData[];
  lowStockItems: LowStockItemData[];
  recentActivity: RecentActivityData[];
  
  // NEW sections
  bulkSalesSummary: BulkSalesSummary;
  serviceIncomeSummary: ServiceIncomeSummary;
  recentBulkSales: RecentBulkSaleData[];
  recentOrders: RecentOrderData[];
}
```

---

### 4. Monthly Data

**Endpoint:** `GET /reports/monthly`

**Query Parameters:** Same as Financial Summary

**Response:**
```typescript
interface MonthlyDataResponse {
  month: string;    // e.g., "Jan", "Feb"
  revenue: number;  // Combined: retail + bulk + service
  cost: number;
  profit: number;
}[]
```

---

### 5. Category Data

**Endpoint:** `GET /reports/categories`

**Query Parameters:** Same as Financial Summary

**Response:**
```typescript
interface CategoryDataResponse {
  name: string;     // Category name
  value: number;    // Total profit for category
  color: string;    // Hex color for charts (e.g., "#8884d8")
}[]
```

---

### 6. Product Performance

**Endpoint:** `GET /reports/products`

**Query Parameters:** Same as Financial Summary

**Response:**
```typescript
interface ProductPerformanceResponse {
  productId: string;
  productName: string;
  category: string;
  unitsSold: number;
  costPrice: number;
  sellingPrice: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;   // Percentage
}[]
```

---

### 7. Sales Channel Distribution

**Endpoint:** `GET /reports/sales-channels`

**Query Parameters:** Same as Financial Summary

**Response:**
```typescript
interface SalesChannelResponse {
  channel: 'retail' | 'bulk' | 'service';
  revenue: number;
  cost: number;
  profit: number;
  count: number;    // Number of transactions
  color: string;    // Hex color for charts
}[]
```

**Chart Usage:** Pie chart or donut chart showing revenue distribution by channel.

---

### 8. Bulk Sales Summary

**Endpoint:** `GET /reports/bulk-sales/summary`

**Query Parameters:** Same as Financial Summary

**Response:**
```typescript
interface BulkSalesSummaryResponse {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalDiscount: number;
  salesCount: number;
  topCompanies: {
    name: string;
    totalPurchases: number;
    revenue: number;
  }[];
}
```

---

### 9. Service Income Summary

**Endpoint:** `GET /reports/service-income/summary`

**Query Parameters:** Same as Financial Summary

**Response:**
```typescript
interface ServiceIncomeSummaryResponse {
  totalIncome: number;
  ordersCount: number;
  averageChargePerOrder: number;
  topServices: {
    description: string;
    totalCharge: number;
    count: number;
  }[];
}
```

---

### 10. Monthly Revenue by Channel

**Endpoint:** `GET /reports/revenue-by-channel`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `months` | number | No | 6 | Number of months to retrieve |

**Response:**
```typescript
interface MonthlyRevenueByChannelResponse {
  month: string;      // e.g., "Jan 26"
  retail: number;
  bulk: number;
  service: number;
  total: number;
}[]
```

**Chart Usage:** Stacked bar chart or area chart showing revenue trends by channel.

---

### 11. Recent Bulk Sales

**Endpoint:** `GET /reports/recent-bulk-sales`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 5 | Number of records to retrieve |

**Response:**
```typescript
interface RecentBulkSaleResponse {
  id: string;
  saleId: string;
  companyName: string;
  total: number;
  profit: number;
  cashier: string;
  createdAt: string;    // ISO date
  itemsPreview: string[];  // First 3 product names
}[]
```

---

### 12. Recent Orders

**Endpoint:** `GET /reports/recent-orders`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 5 | Number of records to retrieve |

**Response:**
```typescript
interface RecentOrderResponse {
  id: number;
  fullName: string;
  orderType: 'SERVICE' | 'PRODUCT_PURCHASE' | 'CUSTOM_REQUEST' | 'IDCARD_ORDER';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;    // ISO date
  serviceCount: number;
  productCount: number;
  totalServiceCharge: number;
}[]
```

---

### 13. Export Report

**Endpoint:** `GET /reports/export`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | No | `csv` (default) or `json` |
| ...other filter params | | | Same as Financial Summary |

**Response:** File download (CSV or JSON)

---

## TypeScript Interfaces

### Common Chart Data Types

```typescript
// Stock Movement Chart (Line/Bar)
interface StockMovementData {
  month: string;
  year: number;
  inbound: number;
  outbound: number;
  stockValue: number;
  netChange: number;
}

// Weekly Sales Trend (Line)
interface SalesTrendData {
  week: string;       // e.g., "Week 1"
  revenue: number;
  units: number;
  orders: number;
}

// Category Distribution (Pie)
interface CategoryData {
  name: string;
  count: number;
  value: number;
  color: string;
}

// Sales Performance (Bar/Line)
interface SalesPerformanceData {
  month: string;      // e.g., "Jan 26"
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

// Inventory Health (Pie/Donut)
interface InventoryHealthData {
  name: 'Healthy' | 'Warning' | 'Critical' | 'Out of Stock';
  value: number;
  color: string;
}

// Profit Trend (Line)
interface ProfitTrendData {
  month: string;
  profit: number;
  margin: number;     // Percentage
}

// Sales Channel (Pie/Donut)
interface SalesChannelData {
  channel: 'retail' | 'bulk' | 'service';
  revenue: number;
  cost: number;
  profit: number;
  count: number;
  color: string;
}

// Monthly Revenue by Channel (Stacked Bar/Area)
interface MonthlyRevenueByChannelData {
  month: string;
  retail: number;
  bulk: number;
  service: number;
  total: number;
}
```

### Card/List Data Types

```typescript
// Top Selling Products
interface TopProductData {
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  growth: number;     // Percentage (can be negative)
}

// Low Stock Items
interface LowStockItemData {
  name: string;
  category: string;
  current: number;
  threshold: number;
  value: number;
}

// Recent Activity
interface RecentActivityData {
  type: 'IN' | 'OUT' | 'ADDED' | 'EDITED';
  product: string;
  quantity: number;
  user: string;
  time: string;       // e.g., "2 hours ago"
  timestamp: string;  // ISO date
}

// Bulk Sales Summary
interface BulkSalesSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalDiscount: number;
  salesCount: number;
  topCompanies: {
    name: string;
    totalPurchases: number;
    revenue: number;
  }[];
}

// Service Income Summary
interface ServiceIncomeSummary {
  totalIncome: number;
  ordersCount: number;
  averageChargePerOrder: number;
  topServices: {
    description: string;
    totalCharge: number;
    count: number;
  }[];
}

// Recent Bulk Sale (for list)
interface RecentBulkSaleData {
  id: string;
  saleId: string;
  companyName: string;
  total: number;
  profit: number;
  cashier: string;
  createdAt: string;
  itemsPreview: string[];
}

// Recent Order (for list)
interface RecentOrderData {
  id: number;
  fullName: string;
  orderType: 'SERVICE' | 'PRODUCT_PURCHASE' | 'CUSTOM_REQUEST' | 'IDCARD_ORDER';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  serviceCount: number;
  productCount: number;
  totalServiceCharge: number;
}
```

### Filter DTO

```typescript
interface ReportFilterDto {
  startDate?: string;   // ISO date string
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  category?: string;
}
```

---

## Usage Examples

### React Query Example

```typescript
// hooks/useReports.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = '/api/reports';

export const useEnhancedDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'enhanced'],
    queryFn: async () => {
      const { data } = await axios.get<EnhancedDashboardResponse>(
        `${API_BASE}/dashboard/enhanced`
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useFinancialSummary = (filter: ReportFilterDto) => {
  return useQuery({
    queryKey: ['reports', 'summary', filter],
    queryFn: async () => {
      const { data } = await axios.get<FinancialSummaryResponse>(
        `${API_BASE}/summary`,
        { params: filter }
      );
      return data;
    },
  });
};

export const useSalesChannels = (filter: ReportFilterDto) => {
  return useQuery({
    queryKey: ['reports', 'sales-channels', filter],
    queryFn: async () => {
      const { data } = await axios.get<SalesChannelResponse[]>(
        `${API_BASE}/sales-channels`,
        { params: filter }
      );
      return data;
    },
  });
};

export const useRevenueByChannel = (months: number = 6) => {
  return useQuery({
    queryKey: ['reports', 'revenue-by-channel', months],
    queryFn: async () => {
      const { data } = await axios.get<MonthlyRevenueByChannelData[]>(
        `${API_BASE}/revenue-by-channel`,
        { params: { months } }
      );
      return data;
    },
  });
};
```

### Dashboard Component Example

```tsx
// components/Dashboard.tsx
import { useEnhancedDashboard } from '../hooks/useReports';
import { PieChart, BarChart, LineChart } from 'recharts';

export const Dashboard = () => {
  const { data, isLoading, error } = useEnhancedDashboard();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="dashboard">
      {/* Summary Cards */}
      <div className="summary-cards">
        <Card title="Monthly Revenue" value={formatCurrency(data.summaryCards.monthlyRevenue)} />
        <Card title="Monthly Profit" value={formatCurrency(data.summaryCards.monthlyProfit)} />
        <Card title="Retail Sales" value={formatCurrency(data.summaryCards.totalRetailSales)} />
        <Card title="Bulk Sales" value={formatCurrency(data.summaryCards.totalBulkSales)} />
        <Card title="Service Income" value={formatCurrency(data.summaryCards.totalServiceIncome)} />
        <Card title="Low Stock Alerts" value={data.summaryCards.lowStockAlerts} variant="warning" />
      </div>

      {/* Sales Channel Distribution Pie Chart */}
      <div className="chart-container">
        <h3>Sales by Channel</h3>
        <PieChart data={data.charts.salesChannelDistribution}>
          {/* ... chart config */}
        </PieChart>
      </div>

      {/* Revenue by Channel Stacked Bar Chart */}
      <div className="chart-container">
        <h3>Monthly Revenue by Channel</h3>
        <BarChart data={data.charts.monthlyRevenueByChannel}>
          <Bar dataKey="retail" stackId="a" fill="#4CAF50" name="Retail" />
          <Bar dataKey="bulk" stackId="a" fill="#2196F3" name="Bulk" />
          <Bar dataKey="service" stackId="a" fill="#FF9800" name="Service" />
        </BarChart>
      </div>

      {/* Bulk Sales Summary */}
      <div className="summary-section">
        <h3>Bulk Sales Overview</h3>
        <p>Total: {formatCurrency(data.bulkSalesSummary.totalRevenue)}</p>
        <p>Profit: {formatCurrency(data.bulkSalesSummary.totalProfit)}</p>
        <h4>Top Companies</h4>
        <ul>
          {data.bulkSalesSummary.topCompanies.map(company => (
            <li key={company.name}>
              {company.name} - {formatCurrency(company.revenue)} ({company.totalPurchases} orders)
            </li>
          ))}
        </ul>
      </div>

      {/* Recent Bulk Sales List */}
      <div className="recent-list">
        <h3>Recent Bulk Sales</h3>
        {data.recentBulkSales.map(sale => (
          <div key={sale.id} className="list-item">
            <span className="company">{sale.companyName}</span>
            <span className="amount">{formatCurrency(sale.total)}</span>
            <span className="date">{formatDate(sale.createdAt)}</span>
          </div>
        ))}
      </div>

      {/* Recent Orders List */}
      <div className="recent-list">
        <h3>Recent Orders</h3>
        {data.recentOrders.map(order => (
          <div key={order.id} className="list-item">
            <span className="name">{order.fullName}</span>
            <span className="type">{order.orderType}</span>
            <span className="status" data-status={order.status}>{order.status}</span>
            <span className="charge">{formatCurrency(order.totalServiceCharge)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Color Palette

Use these consistent colors across charts:

| Channel/Category | Color | Hex |
|------------------|-------|-----|
| Retail | Green | `#4CAF50` |
| Bulk | Blue | `#2196F3` |
| Service | Orange | `#FF9800` |
| Healthy | Green | `#4CAF50` |
| Warning | Yellow | `#FFC107` |
| Critical | Orange | `#FF9800` |
| Out of Stock | Red | `#F44336` |
| Revenue | Green | `#4CAF50` |
| Cost | Red | `#F44336` |
| Profit | Blue | `#2196F3` |

---

## Notes

1. **Caching**: Dashboard requests can be cached for 5 minutes as data doesn't change frequently.
2. **Error Handling**: All endpoints return standard HTTP error codes with error messages.
3. **Authentication**: All endpoints require authentication (Bearer token in Authorization header).
4. **Date Formats**: All dates in responses are ISO 8601 format. Send dates in ISO format for filters.
