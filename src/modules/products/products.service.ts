import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

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
        ...dto,
        companyId,
      },
    });
  }

  async findOne(companyId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, companyId },
      include: { category: true },
    });
  }
}