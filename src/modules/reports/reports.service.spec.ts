import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('calcule le bénéfice sur le coût des produits vendus, pas sur les achats du mois', async () => {
    const prisma = {
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            total: 3000,
            items: [{ quantity: 2, costPrice: 500 }],
          },
        ]),
      },
      stockEntry: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 10000 } }),
      },
    } as any;

    const service = new ReportsService(prisma);

    await expect(service.getProfitLoss('company-1')).resolves.toMatchObject({
      revenue: 3000,
      costs: 1000,
      expenses: 10000,
      profit: 2000,
      isProfit: true,
    });
  });
});