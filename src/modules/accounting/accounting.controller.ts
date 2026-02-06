import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { AccountingService } from './accounting.service';
import {
  CreatePocketDto,
  UpdatePocketDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
  SummaryQueryDto,
  ExportQueryDto,
} from './dto';

@Controller('api/accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ==================== EXPENSE CATEGORIES ====================

  @Get('categories')
  async getCategories() {
    try {
      const categories = await this.accountingService.getExpenseCategories();
      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message || 'Failed to fetch categories',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==================== POCKETS ====================

  @Get('pockets')
  async findAllPockets() {
    try {
      const pockets = await this.accountingService.findAllPockets();
      return {
        success: true,
        data: pockets,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message || 'Failed to fetch pockets',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('pockets/:id')
  async findOnePocket(@Param('id') id: string) {
    try {
      const pocket = await this.accountingService.findOnePocket(id);
      return {
        success: true,
        data: pocket,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'POCKET_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to fetch pocket',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('pockets')
  async createPocket(@Body() createPocketDto: CreatePocketDto) {
    try {
      const pocket = await this.accountingService.createPocket(createPocketDto);
      return {
        success: true,
        data: pocket,
      };
    } catch (error) {
      let code = 'INTERNAL_ERROR';
      if (error.status === 409) code = 'DUPLICATE_POCKET_NAME';
      if (error.status === 400) code = 'VALIDATION_ERROR';

      throw new HttpException(
        {
          success: false,
          error: {
            code,
            message: error.message || 'Failed to create pocket',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('pockets/:id')
  async updatePocket(
    @Param('id') id: string,
    @Body() updatePocketDto: UpdatePocketDto
  ) {
    try {
      const pocket = await this.accountingService.updatePocket(id, updatePocketDto);
      return {
        success: true,
        data: pocket,
      };
    } catch (error) {
      let code = 'INTERNAL_ERROR';
      if (error.status === 404) code = 'POCKET_NOT_FOUND';
      if (error.status === 409) code = 'DUPLICATE_POCKET_NAME';
      if (error.status === 400) code = 'VALIDATION_ERROR';

      throw new HttpException(
        {
          success: false,
          error: {
            code,
            message: error.message || 'Failed to update pocket',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('pockets/:id')
  async deletePocket(@Param('id') id: string) {
    try {
      const result = await this.accountingService.deletePocket(id);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'POCKET_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to delete pocket',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==================== TRANSACTIONS ====================

  @Get('pockets/:pocketId/transactions')
  async findAllTransactions(
    @Param('pocketId') pocketId: string,
    @Query() query: TransactionQueryDto
  ) {
    try {
      const result = await this.accountingService.findAllTransactions(pocketId, query);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'POCKET_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to fetch transactions',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('pockets/:pocketId/transactions')
  async createTransaction(
    @Param('pocketId') pocketId: string,
    @Body() createTransactionDto: CreateTransactionDto
  ) {
    try {
      const result = await this.accountingService.createTransaction(
        pocketId,
        createTransactionDto
      );
      return {
        success: true,
        data: result.transaction,
        pocket: result.pocket,
      };
    } catch (error) {
      let code = 'INTERNAL_ERROR';
      if (error.status === 404) code = 'POCKET_NOT_FOUND';
      if (error.status === 400) {
        code = error.message?.includes('category') ? 'INVALID_CATEGORY' : 'VALIDATION_ERROR';
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code,
            message: error.message || 'Failed to create transaction',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('transactions/:id')
  async findOneTransaction(@Param('id') id: string) {
    try {
      const transaction = await this.accountingService.findOneTransaction(id);
      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'TRANSACTION_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to fetch transaction',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('transactions/:id')
  async updateTransaction(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto
  ) {
    try {
      const transaction = await this.accountingService.updateTransaction(
        id,
        updateTransactionDto
      );
      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      let code = 'INTERNAL_ERROR';
      if (error.status === 404) code = 'TRANSACTION_NOT_FOUND';
      if (error.status === 400) {
        code = error.message?.includes('category') ? 'INVALID_CATEGORY' : 'VALIDATION_ERROR';
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code,
            message: error.message || 'Failed to update transaction',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('transactions/:id/toggle-attached')
  async toggleDetailAttached(@Param('id') id: string) {
    try {
      const result = await this.accountingService.toggleDetailAttached(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'TRANSACTION_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to toggle detail attached',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Param('id') id: string) {
    try {
      const result = await this.accountingService.deleteTransaction(id);
      return {
        success: true,
        message: result.message,
        pocket: result.pocket,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'TRANSACTION_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to delete transaction',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==================== SUMMARY & REPORTS ====================

  @Get('pockets/:pocketId/summary')
  async getPocketSummary(
    @Param('pocketId') pocketId: string,
    @Query() query: SummaryQueryDto
  ) {
    try {
      const summary = await this.accountingService.getPocketSummary(pocketId, query);
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'POCKET_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to fetch summary',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('pockets/:pocketId/export')
  async exportTransactions(
    @Param('pocketId') pocketId: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response
  ) {
    try {
      const { filename, content } = await this.accountingService.exportTransactions(
        pocketId,
        query
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.status === 404 ? 'POCKET_NOT_FOUND' : 'INTERNAL_ERROR',
            message: error.message || 'Failed to export transactions',
          },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
