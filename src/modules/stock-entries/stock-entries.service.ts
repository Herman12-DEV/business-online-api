import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';

@Injectable()
export class StockEntriesService {
  constructor(private prisma: PrismaService) {}

  // Génère une référence unique : ENT-2026-0001
  private async generateReference(companyId: string): Promise<string> {
    const count = await this.prisma.stockEntry.count({ where: { companyId } });
    const year = new Date().getFullYear();
    const number = String(count + 1).padStart(4, '0');
    return `ENT-${year}-${number}`;
  }

  async findAll(companyId: string) {
    return this.prisma.stockEntry.findMany({
      where: { companyId },
      include: {
        supplier: true,
        user: { select: { name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, userId: string, dto: CreateStockEntryDto) {
    const total = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const reference = await this.generateReference(companyId);

    return this.prisma.$transaction(async (tx) => {
      const stockEntry = await tx.stockEntry.create({
        data: {
          companyId,
          userId,
          supplierId: dto.supplierId,
          invoiceNum: dto.invoiceNum,
          reference,
          total,
          status: 'COMPLETED',
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Stock augmente (increment) au lieu de diminuer
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return stockEntry;
    });
  }

  async findOne(companyId: string, id: string) {
    return this.prisma.stockEntry.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        user: { select: { name: true } },
        items: { include: { product: true } },
      },
    });
  }
}