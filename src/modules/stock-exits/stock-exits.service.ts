import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockExitDto } from './dto/create-stock-exit.dto';

@Injectable()
export class StockExitsService {
  constructor(private prisma: PrismaService) {}

  private async generateReference(companyId: string): Promise<string> {
    const count = await this.prisma.stockExit.count({ where: { companyId } });
    const year = new Date().getFullYear();
    const number = String(count + 1).padStart(4, '0');
    return `SOR-${year}-${number}`;
  }

  async findAll(companyId: string) {
    return this.prisma.stockExit.findMany({
      where: { companyId },
      include: {
        user: { select: { name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, userId: string, dto: CreateStockExitDto) {
    const reference = await this.generateReference(companyId);

    return this.prisma.$transaction(async (tx) => {
      const stockExit = await tx.stockExit.create({
        data: {
          companyId,
          userId,
          reference,
          type: dto.type,
          reason: dto.reason,
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

      // Stock diminue
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return stockExit;
    });
  }

  async findOne(companyId: string, id: string) {
    return this.prisma.stockExit.findFirst({
      where: { id, companyId },
      include: {
        user: { select: { name: true } },
        items: { include: { product: true } },
      },
    });
  }
}