import { Test, TestingModule } from '@nestjs/testing';

import { SalesService } from '../src/modules/sales/sales.service';
import { prismaMock, resetPrismaMock } from './prisma.mock';

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(async () => {
    resetPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: 'PrismaService',
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  describe('findAll', () => {
    it('devrait retourner toutes les ventes de la company', async () => {
      const sales = [
        {
          id: 's1',
          reference: 'VTE-2026-0001',
          total: '5000',
          status: 'COMPLETED',
          client: null,
          user: { name: 'Jean' },
          items: [],
        },
      ];

      prismaMock.sale.findMany.mockResolvedValue(sales as any);

      const result = await service.findAll('company-1');

      expect(prismaMock.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-1' },
        }),
      );
      expect(result).toEqual(sales);
    });
  });

  describe('create', () => {
    const dto = {
      paymentMode: 'Mobile Money',
      status: 'COMPLETED' as const,
      items: [
        { productId: 'p1', quantity: 2, unitPrice: 1000 },
        { productId: 'p2', quantity: 1, unitPrice: 500 },
      ],
    };

    it('devrait calculer correctement le total', async () => {
      // Arrange
      prismaMock.sale.count.mockResolvedValue(0);
      prismaMock.sale.create.mockResolvedValue({
        id: 's1',
        reference: 'VTE-2026-0001',
        subtotal: 2500,
        discount: 0,
        delivery: 0,
        total: 2500,
        items: [],
      } as any);

      // Act
      const result = await service.create('company-1', 'user-1', dto);

      // Assert — 2*1000 + 1*500 = 2500
      expect(result.subtotal).toBe(2500);
      expect(result.total).toBe(2500);
    });

    it('devrait appliquer le discount et la delivery', async () => {
      // Arrange
      prismaMock.sale.count.mockResolvedValue(5);
      prismaMock.sale.create.mockResolvedValue({} as any);

      await service.create('company-1', 'user-1', {
        ...dto,
        discount: 200,
        delivery: 300,
      });

      const createCall = prismaMock.sale.create.mock.calls[0][0];
      // 2500 - 200 + 300 = 2600
      expect(createCall.data.total).toBe(2600);
      expect(createCall.data.discount).toBe(200);
      expect(createCall.data.delivery).toBe(300);
    });

    it('devrait générer une référence unique', async () => {
      // Arrange
      prismaMock.sale.count.mockResolvedValue(7);
      prismaMock.sale.create.mockResolvedValue({ id: 's1' } as any);

      // Act
      await service.create('company-1', 'user-1', dto);

      // Assert
      const createCall = prismaMock.sale.create.mock.calls[0][0];
      // 7 ventes existantes → 8e → VTE-2026-0008
      expect(createCall.data.reference).toBe('VTE-2026-0008');
    });

    it('devrait décrémenter le stock quand la vente est COMPLETED', async () => {
      // Arrange
      prismaMock.sale.count.mockResolvedValue(0);
      prismaMock.sale.create.mockResolvedValue({ id: 's1', items: [] } as any);
      prismaMock.product.update.mockResolvedValue({} as any);

      // Act
      await service.create('company-1', 'user-1', dto);

      // Assert
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stock: { decrement: 2 } },
      });
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { stock: { decrement: 1 } },
      });
    });

    it('ne devrait PAS décrémenter le stock pour une vente PENDING', async () => {
      // Arrange
      prismaMock.sale.count.mockResolvedValue(0);
      prismaMock.sale.create.mockResolvedValue({ id: 's1' } as any);

      // Act
      await service.create('company-1', 'user-1', {
        ...dto,
        status: 'PENDING',
      });

      // Assert
      expect(prismaMock.product.update).not.toHaveBeenCalled();
    });

    it('devrait créer un client à la volée si clientName fourni', async () => {
      // Arrange
      prismaMock.sale.count.mockResolvedValue(0);
      prismaMock.client.create.mockResolvedValue({
        id: 'client-1',
        name: 'Nouveau client',
      } as any);
      prismaMock.sale.create.mockResolvedValue({ id: 's1' } as any);

      // Act
      await service.create('company-1', 'user-1', {
        ...dto,
        clientName: 'Nouveau client',
      });

      // Assert
      expect(prismaMock.client.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          name: 'Nouveau client',
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('devrait remettre le stock quand une vente COMPLETED est annulée', async () => {
      // Arrange
      prismaMock.sale.findFirst.mockResolvedValue({
        id: 's1',
        status: 'COMPLETED',
        items: [
          { productId: 'p1', quantity: 3 },
          { productId: 'p2', quantity: 2 },
        ],
      } as any);

      prismaMock.sale.update.mockResolvedValue({} as any);
      prismaMock.product.update.mockResolvedValue({} as any);

      // Act
      await service.updateStatus('company-1', 's1', 'CANCELLED');

      // Assert — on remet le stock (incrément)
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stock: { increment: 3 } },
      });
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { stock: { increment: 2 } },
      });
    });

    it('devrait décrémenter le stock quand une vente PENDING devient COMPLETED', async () => {
      // Arrange
      prismaMock.sale.findFirst.mockResolvedValue({
        id: 's1',
        status: 'PENDING',
        items: [{ productId: 'p1', quantity: 5 }],
      } as any);

      prismaMock.sale.update.mockResolvedValue({} as any);
      prismaMock.product.update.mockResolvedValue({} as any);

      // Act
      await service.updateStatus('company-1', 's1', 'COMPLETED');

      // Assert
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stock: { decrement: 5 } },
      });
    });

    it('devrait lancer une erreur si la vente nexiste pas', async () => {
      // Arrange
      prismaMock.sale.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateStatus('company-1', 'inconnu', 'COMPLETED'),
      ).rejects.toThrow('Vente introuvable');
    });
  });
});