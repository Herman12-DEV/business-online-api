import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private async generateReference(companyId: string): Promise<string> {
    const count = await this.prisma.sale.count({ where: { companyId } });
    const year = new Date().getFullYear();
    const number = String(count + 1).padStart(4, '0');
    return `VTE-${year}-${number}`;
  }

  async findAll(companyId: string) {
    return this.prisma.sale.findMany({
      where: { companyId },
      include: {
        client: true,
        user: { select: { name: true } },
        items: {
          include: {
            product: {
              select: { name: true, imageUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, userId: string, dto: CreateSaleDto) {
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const discount = dto.discount ?? 0;
    const delivery = dto.delivery ?? 0;
    const total = subtotal - discount + delivery;
    const reference = await this.generateReference(companyId);

    // Si clientName fourni, crée le client à la volée
    let clientId = dto.clientId;
    if (!clientId && dto.clientName) {
      const client = await this.prisma.client.create({
        data: {
          companyId,
          name: dto.clientName,
        },
      });
      clientId = client.id;
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          companyId,
          userId,
          clientId,
          reference,
          paymentMode: dto.paymentMode ?? 'Especes',
          subtotal,
          discount,
          delivery,
          total,
          status: dto.status ?? 'COMPLETED',
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, imageUrl: true },
              },
            },
          },
        },
      });

      // Diminue le stock seulement si la vente est COMPLETED
      if ((dto.status ?? 'COMPLETED') === 'COMPLETED') {
        for (const item of dto.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return sale;
    });
  }

  async findOne(companyId: string, id: string) {
    return this.prisma.sale.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        user: { select: { name: true } },
        items: {
          include: {
            product: {
              select: { name: true, imageUrl: true },
            },
          },
        },
      },
    });
  }
}