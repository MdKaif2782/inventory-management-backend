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