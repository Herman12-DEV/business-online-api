import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.clientsService.findAll(req.user.companyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateClientDto) {
    return this.clientsService.create(req.user.companyId, dto);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.clientsService.findOne(req.user.companyId, id);
  }
}