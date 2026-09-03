import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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


            // Vérifie le stock disponible pour chaque produit
        if ((dto.status ?? 'COMPLETED') === 'COMPLETED') {
          for (const item of dto.items) {
            const product = await this.prisma.product.findUnique({
              where: { id: item.productId },
              select: { name: true, stock: true },
            });

            if (!product) {
              throw new BadRequestException(`Produit introuvable`);
            }

            if (product.stock < item.quantity) {
              throw new BadRequestException(
                `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}, demandé : ${item.quantity}`
              );
            }
          }
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

  async updateStatus(companyId: string, id: string, status: 'PENDING' | 'COMPLETED' | 'CANCELLED') {
  const sale = await this.prisma.sale.findFirst({
    where: { id, companyId },
    include: { items: true },
  });

  if (sale.status === 'PENDING' && status === 'COMPLETED') {
  // Vérifie le stock avant de compléter
  for (const item of sale.items) {
    const product = await this.prisma.product.findUnique({
      where: { id: item.productId },
      select: { name: true, stock: true },
    });
    if (product && product.stock < item.quantity) {
      throw new BadRequestException(
        `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}, demandé : ${item.quantity}`
      );
    }
  }
  // ... reste du code
}





  if (!sale) throw new NotFoundException('Vente introuvable');

  // Si on passe de PENDING à COMPLETED → diminue le stock
  if (sale.status === 'PENDING' && status === 'COMPLETED') {
    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status },
      });
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    });
    return;
  }

  // Si on annule une vente COMPLETED → remet le stock
  if (sale.status === 'COMPLETED' && status === 'CANCELLED') {
    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status },
      });
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });
    return;
  }

  // Autres changements de statut
  await this.prisma.sale.update({
    where: { id },
    data: { status },
  });
}
}