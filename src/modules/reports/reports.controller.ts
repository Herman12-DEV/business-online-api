import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  getSalesReport(@Request() req: any) {
    return this.reportsService.getSalesReport(req.user.companyId);
  }

  @Get('profit-loss')
  getProfitLoss(@Request() req: any) {
    return this.reportsService.getProfitLoss(req.user.companyId);
  }

  // Nouvel endpoint détaillé
  @Get('sales/detailed')
  getSalesReportDetailed(
    @Request() req: any,
    @Query('period') period: string = 'month',
  ) {
    const validPeriods = ['today', 'week', 'month', 'quarter', 'year'];
    const safePeriod = validPeriods.includes(period) ? period : 'month';
    return this.reportsService.getSalesReportDetailed(
      req.user.companyId,
      safePeriod as any,
    );
  }

  @Get('profit-loss/detailed')
  getProfitLossDetailed(
    @Request() req: any,
    @Query('period') period: string = 'month',
  ) {
    const validPeriods = ['today', 'week', 'month', 'quarter', 'year'];
    const safePeriod = validPeriods.includes(period) ? period : 'month';
    return this.reportsService.getProfitLossDetailed(req.user.companyId, safePeriod as any);
  }
}