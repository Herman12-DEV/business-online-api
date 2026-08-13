import { Controller, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private prisma: PrismaService) {}

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    // Sécurité : on ne peut modifier que sa propre entreprise
    if (req.user.companyId !== id) {
      throw new Error('Non autorisé');
    }
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }
}