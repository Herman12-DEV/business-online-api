import { Controller, Patch, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
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
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre entreprise');
    }
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }
}