import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StockEntriesService } from './stock-entries.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)  // toutes les routes de ce controller sont protégées
@Controller('stock-entries')
export class StockEntriesController {
  constructor(private stockEntriesService: StockEntriesService) {}

  @Get()
  findAll(@Request() req: any) {
    // req.user contient les infos du token JWT
    // dont req.user.companyId
    return this.stockEntriesService.findAll(req.user.companyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateStockEntryDto) {
    return this.stockEntriesService.create(req.user.companyId, req.user.id, dto);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.stockEntriesService.findOne(req.user.companyId, id);
  }
}