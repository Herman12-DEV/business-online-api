import { StockEntriesService } from './stock-entries.service';

describe('StockEntriesService', () => {
  it('met à jour le coût moyen après un achat', async () => {
    const prisma = {
      stockEntry: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ stock: 10, costPrice: 1000 }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
    } as any;

    const service = new StockEntriesService(prisma);

    await service.create('company-1', 'user-1', {
      items: [{ productId: 'product-1', quantity: 10, unitPrice: 1500 }],
    });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { stock: { increment: 10 }, costPrice: 1250 },
    });
  });
});