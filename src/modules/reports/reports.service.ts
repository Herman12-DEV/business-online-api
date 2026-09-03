import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers de période ───────────────────────────────────

  private getPeriodRange(period: Period): { start: Date; end: Date } {
    const now = new Date();

    switch (period) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return { start, end };
      }
      case 'week': {
        const day = now.getDay(); // 0 = dimanche
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // lundi
        const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
        return { start, end };
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { start, end };
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
        return { start, end };
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return { start, end };
      }
    }
  }

  private getPreviousPeriodRange(period: Period): { start: Date; end: Date } {
    const now = new Date();

    switch (period) {
      case 'today': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0),
          end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59),
        };
      }
      case 'week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now.getFullYear(), now.getMonth(), diff - 7, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), diff - 1, 23, 59, 59);
        return { start, end };
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start, end };
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
        const end = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59);
        return { start, end };
      }
      case 'year': {
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        return { start, end };
      }
    }
  }

  // Génère les points du graphique selon la période
  private buildChartData(
    sales: { createdAt: Date; total: any }[],
    period: Period,
  ): { label: string; value: number }[] {
    const map = new Map<string, number>();

    for (const sale of sales) {
      const date = new Date(sale.createdAt);
      let key: string;

      switch (period) {
        case 'today':
          key = `${date.getHours()}h`;
          break;
        case 'week': {
          const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
          key = days[date.getDay()];
          break;
        }
        case 'month':
          key = `${date.getDate()}`;
          break;
        case 'quarter':
        case 'year': {
          const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          key = months[date.getMonth()];
          break;
        }
      }

      map.set(key, (map.get(key) ?? 0) + Number(sale.total));
    }

    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }

  // Génère un insight textuel basé sur les données
  private buildInsight(
    currentRevenue: number,
    previousRevenue: number,
    trendPercent: number | null,
    topProduct: { name: string } | null,
    totalSales: number,
  ): string | null {
    if (totalSales === 0) return null;

    if (trendPercent !== null && previousRevenue > 0) {
      if (trendPercent > 0) {
        return `Tes ventes progressent de ${trendPercent.toFixed(1)} % par rapport à la période précédente.`;
      } else if (trendPercent < 0) {
        return `Ton chiffre d'affaires est en baisse de ${Math.abs(trendPercent).toFixed(1)} % par rapport à la période précédente.`;
      } else {
        return `Ton chiffre d'affaires est stable par rapport à la période précédente.`;
      }
    }

    if (topProduct) {
      return `${topProduct.name} est ton produit le plus vendu sur cette période.`;
    }

    return null;
  }

  // ─── Endpoint existants (inchangés) ──────────────────────

  private getCurrentMonthRange() {
    return this.getPeriodRange('month');
  }

  async getSalesReport(companyId: string) {
    const { start, end } = this.getCurrentMonthRange();

    const sales = await this.prisma.sale.findMany({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      include: { items: { include: { product: true } } },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalProducts = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );

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

    return { totalRevenue, totalSales: sales.length, totalProducts, topProducts };
  }

  async getProfitLoss(companyId: string) {
    const { start, end } = this.getCurrentMonthRange();

    const sales = await this.prisma.sale.aggregate({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      _sum: { total: true },
    });

    const entries = await this.prisma.stockEntry.aggregate({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      _sum: { total: true },
    });

    const revenue = Number(sales._sum.total ?? 0);
    const costs = Number(entries._sum.total ?? 0);
    const profit = revenue - costs;

    return { revenue, costs, profit, isProfit: profit >= 0 };
  }

  // ─── Nouvel endpoint détaillé ────────────────────────────

  async getSalesReportDetailed(companyId: string, period: Period) {
    const { start, end } = this.getPeriodRange(period);
    const { start: prevStart, end: prevEnd } = this.getPreviousPeriodRange(period);

    // Ventes période actuelle
    const currentSales = await this.prisma.sale.findMany({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });

    // Ventes période précédente (agrégat uniquement)
    const prevAggregate = await this.prisma.sale.aggregate({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { total: true },
      _count: true,
    });

    // Calculs période actuelle
    const currentRevenue = currentSales.reduce((sum, s) => sum + Number(s.total), 0);
    const currentCount = currentSales.length;
    const averageBasket = currentCount > 0 ? currentRevenue / currentCount : 0;

    // Calculs période précédente
    const previousRevenue = Number(prevAggregate._sum.total ?? 0);
    const previousCount = prevAggregate._count;

    // Tendance %
    let trendPercent: number | null = null;
    if (previousRevenue > 0) {
      trendPercent = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    } else if (currentRevenue > 0) {
      trendPercent = 100;
    }

    // Top produits avec image
    const productMap = new Map<string, {
      id: string;
      name: string;
      imageUrl: string | null;
      quantity: number;
      revenue: number;
    }>();

    for (const sale of currentSales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productId) ?? {
          id: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl ?? null,
          quantity: 0,
          revenue: 0,
        };
        productMap.set(item.productId, {
          ...existing,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.subtotal),
        });
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Données graphique
    const chartData = this.buildChartData(currentSales, period);

    // Insight
    const insight = this.buildInsight(
      currentRevenue,
      previousRevenue,
      trendPercent,
      topProducts[0] ?? null,
      currentCount,
    );

    // Répartition par statut de paiement
    const paymentMap = new Map<string, number>();
    for (const sale of currentSales) {
      const mode = sale.paymentMode;
      paymentMap.set(mode, (paymentMap.get(mode) ?? 0) + Number(sale.total));
    }
    const paymentBreakdown = Array.from(paymentMap.entries()).map(([mode, total]) => ({
      mode,
      total,
      percent: currentRevenue > 0 ? (total / currentRevenue) * 100 : 0,
    }));

    return {
      period,
      current: {
        revenue: currentRevenue,
        sales: currentCount,
        averageBasket: Math.round(averageBasket),
      },
      previous: {
        revenue: previousRevenue,
        sales: previousCount,
      },
      trendPercent: trendPercent !== null ? Math.round(trendPercent * 10) / 10 : null,
      chartData,
      topProducts,
      paymentBreakdown,
      insight,
    };
  }
   
  async getProfitLossDetailed(companyId: string, period: Period) {
  const { start, end } = this.getPeriodRange(period);
  const { start: prevStart, end: prevEnd } = this.getPreviousPeriodRange(period);

  const [currentSalesAgg, currentEntriesAgg, currentSales] = await Promise.all([
    this.prisma.sale.aggregate({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      _sum: { total: true },
      _count: true,
    }),
    this.prisma.stockEntry.aggregate({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      _sum: { total: true },
    }),
    this.prisma.sale.findMany({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      select: { createdAt: true, total: true, subtotal: true },
    }),
  ]);

  const [prevSalesAgg, prevEntriesAgg] = await Promise.all([
    this.prisma.sale.aggregate({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { total: true },
    }),
    this.prisma.stockEntry.aggregate({
      where: { companyId, status: 'COMPLETED', createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { total: true },
    }),
  ]);

  const currentRevenue = Number(currentSalesAgg._sum.total ?? 0);
  const currentCosts = Number(currentEntriesAgg._sum.total ?? 0);
  const currentProfit = currentRevenue - currentCosts;

  const previousRevenue = Number(prevSalesAgg._sum.total ?? 0);
  const previousCosts = Number(prevEntriesAgg._sum.total ?? 0);
  const previousProfit = previousRevenue - previousCosts;

  let profitTrend: number | null = null;
  if (previousProfit !== 0) {
    profitTrend = ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100;
  } else if (currentProfit > 0) {
    profitTrend = 100;
  }

  const margin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
  const chartData = this.buildChartData(currentSales, period);

  let insight: string | null = null;
  if (currentSalesAgg._count > 0) {
    if (profitTrend !== null && Math.abs(profitTrend) > 1) {
      insight = profitTrend > 0
        ? `Ton bénéfice progresse de ${profitTrend.toFixed(1)} % par rapport à la période précédente.`
        : `Ton bénéfice est en baisse de ${Math.abs(profitTrend).toFixed(1)} % par rapport à la période précédente.`;
    } else if (margin > 30) {
      insight = `Ta marge bénéficiaire est de ${margin.toFixed(0)} %. C'est une bonne performance.`;
    } else if (margin > 0) {
      insight = `Ta marge bénéficiaire est de ${margin.toFixed(0)} % sur cette période.`;
    } else if (currentProfit < 0) {
      insight = `Tes coûts dépassent ton chiffre d'affaires. Analyse tes entrées de stock.`;
    }
  }

  return {
    period,
    current: {
      revenue: currentRevenue,
      costs: currentCosts,
      profit: currentProfit,
      isProfit: currentProfit >= 0,
      margin: Math.round(margin * 10) / 10,
      salesCount: currentSalesAgg._count,
    },
    previous: { revenue: previousRevenue, costs: previousCosts, profit: previousProfit },
    profitTrend: profitTrend !== null ? Math.round(profitTrend * 10) / 10 : null,
    chartData,
    insight,
  };
}



}