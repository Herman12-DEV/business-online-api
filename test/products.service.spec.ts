import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { ProductsService } from '../src/modules/products/products.service';
import { prismaMock, resetPrismaMock } from './prisma.mock';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    resetPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: 'PrismaService',
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('devrait retourner les produits dune company', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Produit A',
          sellPrice: '1000',
          costPrice: '500',
          stock: 10,
          unit: 'unite',
          categoryId: null,
          category: null,
        },
      ];

      prismaMock.product.findMany.mockResolvedValue(products as any);

      const result = await service.findAll('company-1');

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(products);
    });

    it('devrait retourner un tableau vide sil y a pas de produits', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.findAll('company-1');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('devrait créer un produit avec les valeurs par défaut', async () => {
      const dto = {
        name: 'Nouveau produit',
        sellPrice: 1500,
        costPrice: 700,
      };

      prismaMock.product.create.mockResolvedValue({
        id: 'p1',
        ...dto,
        stock: 0,
        unit: 'unite',
        categoryId: undefined,
        imageUrl: undefined,
      } as any);

      const result = await service.create('company-1', dto as any);

      expect(prismaMock.product.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          name: dto.name,
          code: undefined,
          sellPrice: dto.sellPrice,
          costPrice: dto.costPrice,
          stock: 0,
          unit: 'unite',
          categoryId: undefined,
          imageUrl: undefined,
        },
      });
      expect(result.id).toBe('p1');
    });

    it('devrait utiliser les valeurs fournies pour stock et unit', async () => {
      const dto = {
        name: 'Test',
        sellPrice: 100,
        costPrice: 50,
        stock: 20,
        unit: 'kg',
      };

      prismaMock.product.create.mockResolvedValue({ id: 'p1' } as any);

      await service.create('company-1', dto as any);

      const createCall = prismaMock.product.create.mock.calls[0][0];
      expect(createCall.data.stock).toBe(20);
      expect(createCall.data.unit).toBe('kg');
    });
  });

  describe('findOne', () => {
    it('devrait retourner un produit par son id', async () => {
      const product = { id: 'p1', name: 'Produit A' };
      prismaMock.product.findFirst.mockResolvedValue(product as any);

      const result = await service.findOne('company-1', 'p1');

      expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', companyId: 'company-1' },
        include: { category: true },
      });
      expect(result).toEqual(product);
    });

    it('devrait lancer NotFoundException si le produit nexiste pas', async () => {
      prismaMock.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne('company-1', 'inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('devrait mettre à jour les champs fournis', async () => {
      prismaMock.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Ancien',
      } as any);

      prismaMock.product.update.mockResolvedValue({
        id: 'p1',
        name: 'Nouveau',
      } as any);

      const result = await service.update('company-1', 'p1', {
        name: 'Nouveau',
      });

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'Nouveau' },
      });
      expect(result.name).toBe('Nouveau');
    });

    it('devrait ignorer les champs non fournis (undefined)', async () => {
      prismaMock.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Ancien',
      } as any);

      prismaMock.product.update.mockResolvedValue({ id: 'p1' } as any);

      await service.update('company-1', 'p1', {});

      const updateCall = prismaMock.product.update.mock.calls[0][0];
      // Aucun champ nest mis à jour
      expect(Object.keys(updateCall.data)).toEqual([]);
    });

    it('devrait lancer NotFoundException si le produit nexiste pas', async () => {
      prismaMock.product.findFirst.mockResolvedValue(null);

      await expect(
        service.update('company-1', 'inconnu', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('devrait supprimer un produit', async () => {
      prismaMock.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Produit',
      } as any);

      prismaMock.product.delete.mockResolvedValue({ id: 'p1' } as any);

      const result = await service.remove('company-1', 'p1');

      expect(prismaMock.product.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
      expect(result.id).toBe('p1');
    });

    it('devrait lancer NotFoundException si le produit nexiste pas', async () => {
      prismaMock.product.findFirst.mockResolvedValue(null);

      await expect(service.remove('company-1', 'inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});