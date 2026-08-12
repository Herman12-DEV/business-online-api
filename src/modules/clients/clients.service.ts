import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

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

  async update(companyId: string, id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
    });
    if (!client) throw new NotFoundException('Client introuvable');

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });
  }

  async remove(companyId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
      include: { _count: { select: { sales: true } } },
    });
    if (!client) throw new NotFoundException('Client introuvable');

    // Garde-fou : pas de suppression si le client a des ventes
    if (client._count.sales > 0) {
      throw new BadRequestException(
        'Impossible de supprimer : ce client a des ventes enregistrées',
      );
    }

    return this.prisma.client.delete({ where: { id } });
  }
}