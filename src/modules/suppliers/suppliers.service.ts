import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId },
      include: {
        _count: { select: { stockEntries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        companyId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
      include: {
        stockEntries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');
    return supplier;
  }
}