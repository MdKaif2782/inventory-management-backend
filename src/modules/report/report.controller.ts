import {
  Controller,
  Get,
  Query,
  Res,
  Header,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportFilterDto } from './dto';
import { Response } from 'express';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  async getFinancialSummary(@Query() filter: ReportFilterDto) {
    return this.reportService.getFinancialSummary(filter);
  }

  @Get('dashboard')
  async getDashboardSummary() {
    return this.reportService.getDashboardSummary();
  }

  @Get('dashboard/enhanced')
  async getEnhancedDashboard() {
    return this.reportService.getEnhancedDashboard();
  }

  @Get('monthly')
  async getMonthlyData(@Query() filter: ReportFilterDto) {
    return this.reportService.getMonthlyData(filter);
  }

  @Get('categories')
  async getCategoryData(@Query() filter: ReportFilterDto) {
    return this.reportService.getCategoryData(filter);
  }

  @Get('products')
  async getProductPerformance(@Query() filter: ReportFilterDto) {
    return this.reportService.getProductPerformance(filter);
  }

  // ==================== NEW ENDPOINTS ====================

  @Get('sales-channels')
  async getSalesChannelDistribution(@Query() filter: ReportFilterDto) {
    return this.reportService.getSalesChannelDistribution(filter);
  }

  @Get('bulk-sales/summary')
  async getBulkSalesSummary(@Query() filter: ReportFilterDto) {
    return this.reportService.getBulkSalesSummary(filter);
  }

  @Get('service-income/summary')
  async getServiceIncomeSummary(@Query() filter: ReportFilterDto) {
    return this.reportService.getServiceIncomeSummary(filter);
  }

  @Get('revenue-by-channel')
  async getMonthlyRevenueByChannel(@Query('months') months?: string) {
    return this.reportService.getMonthlyRevenueByChannel(months ? parseInt(months) : 6);
  }

  @Get('recent-bulk-sales')
  async getRecentBulkSales(@Query('limit') limit?: string) {
    return this.reportService.getRecentBulkSales(limit ? parseInt(limit) : 5);
  }

  @Get('recent-orders')
  async getRecentOrders(@Query('limit') limit?: string) {
    return this.reportService.getRecentOrders(limit ? parseInt(limit) : 5);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="financial-report.csv"')
  async exportReport(@Query() filter: ReportFilterDto, @Query('format') format: string, @Res() res: Response) {
    const exportData = await this.reportService.exportReport(filter, format as 'csv' | 'json');
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="financial-report.json"');
    }
    
    res.send(exportData);
  }
}