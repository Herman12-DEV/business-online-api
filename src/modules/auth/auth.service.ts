import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifie si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hache le mot de passe — on ne stocke JAMAIS un mot de passe en clair
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Crée la company ET le user en même temps (transaction)
    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        users: {
          create: {
            name: dto.name,
            email: dto.email,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = company.users[0];

    // Génère le token JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId: company.id,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: company.id,
      },
    };
  }

  async login(dto: LoginDto) {
    // Cherche l'utilisateur par email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Compare le mot de passe saisi avec le hash stocké
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Génère le token JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}