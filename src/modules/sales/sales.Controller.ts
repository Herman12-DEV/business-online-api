import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)  // toutes les routes de ce controller sont protégées
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  findAll(@Request() req: any) {
    // req.user contient les infos du token JWT
    // dont req.user.companyId
    return this.salesService.findAll(req.user.companyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateSaleDto) {
    return this.salesService.create(req.user.companyId, req.user.id, dto);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.salesService.findOne(req.user.companyId, id);
  }
}