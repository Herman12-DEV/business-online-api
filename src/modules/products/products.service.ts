import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.product.findMany({
      where: { companyId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        companyId,
        name: dto.name,
        code: dto.code,
        sellPrice: dto.sellPrice,
        costPrice: dto.costPrice,
        stock: dto.stock ?? 0,
        unit: dto.unit ?? 'unite',
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.sellPrice !== undefined && { sellPrice: dto.sellPrice }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        // ⚠️ Stock volontairement absent — règle ERP
      },
    });
  }

  async remove(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            saleItems: true,
            stockEntryItems: true,
            stockExitItems: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    const movements =
      product._count.saleItems +
      product._count.stockEntryItems +
      product._count.stockExitItems;

    // Garde-fou : pas de suppression si le produit a un historique
    if (movements > 0) {
      throw new BadRequestException(
        'Impossible de supprimer : ce produit a des mouvements (ventes, entrées ou sorties)',
      );
    }

    return this.prisma.product.delete({ where: { id } });
  }
}