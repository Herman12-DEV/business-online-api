import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

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

  async update(companyId: string, id: string, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });
  }

  async remove(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
      include: { _count: { select: { stockEntries: true } } },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');

    if (supplier._count.stockEntries > 0) {
      throw new BadRequestException(
        'Impossible de supprimer : ce fournisseur a des entrées de stock',
      );
    }

    return this.prisma.supplier.delete({ where: { id } });
  }
}