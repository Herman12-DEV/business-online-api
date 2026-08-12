import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsEnum } from 'class-validator';

class UpdateStatusDto {
  @IsEnum(['PENDING', 'COMPLETED', 'CANCELLED'])
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' = "PENDING";
}

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  findAll(@Request() req: any) {
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

  @Patch(':id/status')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.salesService.updateStatus(req.user.companyId, id, dto.status);
  }
}