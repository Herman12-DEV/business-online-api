import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  // Liste — _count.sales = nombre d'achats par client (fidélité)
  async findAll(companyId: string) {
    return this.prisma.client.findMany({
      where: { companyId },
      include: {
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        companyId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  // Détail — avec l'historique complet des achats du client
  async findOne(companyId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) throw new NotFoundException('Client introuvable');
    return client;
  }
}