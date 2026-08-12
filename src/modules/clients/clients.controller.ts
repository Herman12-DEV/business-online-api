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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
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

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(req.user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.clientsService.remove(req.user.companyId, id);
  }
}