import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.suppliersService.findAll(req.user.companyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(req.user.companyId, dto);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.suppliersService.findOne(req.user.companyId, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(req.user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.suppliersService.remove(req.user.companyId, id);
  }
}