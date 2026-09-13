import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('calcule le bénéfice comme chiffre d affaires moins dépenses d achats', async () => {
    const prisma = {
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            total: 3000,
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
      expenses: 10000,
      profit: -7000,
      isProfit: false,
    });
  });
});