import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
}