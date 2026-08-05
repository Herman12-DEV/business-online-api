import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Retourne le début et la fin du mois en cours
  private getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  async getSalesReport(companyId: string) {
    const { start, end } = this.getCurrentMonthRange();

    const sales = await this.prisma.sale.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: { items: { include: { product: true } } },
    });

    // Calcule le CA total
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.total),
      0,
    );

    // Calcule le nombre total de produits vendus
    const totalProducts = sales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );

    // Top produits vendus
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productId) ?? {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
        productMap.set(item.productId, {
          name: existing.name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.subtotal),
        });
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalSales: sales.length,
      totalProducts,
      topProducts,
    };
  }

  async getProfitLoss(companyId: string) {
    const { start, end } = this.getCurrentMonthRange();

    // CA = somme des ventes terminées
    const sales = await this.prisma.sale.aggregate({
      where: {
        companyId,
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      _sum: { total: true },
    });

    // Coût des entrées stock
    const entries = await this.prisma.stockEntry.aggregate({
      where: {
        companyId,
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      _sum: { total: true },
    });

    const revenue = Number(sales._sum.total ?? 0);
    const costs = Number(entries._sum.total ?? 0);
    const profit = revenue - costs;

    return {
      revenue,
      costs,
      profit,
      isProfit: profit >= 0,
    };
  }
}