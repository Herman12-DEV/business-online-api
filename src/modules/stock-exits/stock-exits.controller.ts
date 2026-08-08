import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StockExitsService } from './stock-exits.service';
import { CreateStockExitDto } from './dto/create-stock-exit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stock-exits')
export class StockExitsController {
  constructor(private stockExitsService: StockExitsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.stockExitsService.findAll(req.user.companyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateStockExitDto) {
    return this.stockExitsService.create(req.user.companyId, req.user.id, dto);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.stockExitsService.findOne(req.user.companyId, id);
  }
}