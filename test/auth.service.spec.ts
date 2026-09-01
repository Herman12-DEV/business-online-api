import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from '../src/modules/auth/auth.service';
import { prismaMock, resetPrismaMock } from './prisma.mock';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    resetPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'PrismaService',
          useValue: prismaMock,
        },
        JwtService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ────────────────────────────────────────────────
  describe('register', () => {
    const registerDto = {
      name: 'Jean Dupont',
      email: 'jean@example.com',
      password: 'motdepasse123',
      companyName: 'Ma Petite Entreprise',
    };

    it('devrait inscrire un nouvel utilisateur et créer la company', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null); // email libre
      mockedBcrypt.hash.mockResolvedValue('hashed-password');

      const createdCompany = {
        id: 'company-1',
        name: registerDto.companyName,
        users: [
          {
            id: 'user-1',
            name: registerDto.name,
            email: registerDto.email,
            passwordHash: 'hashed-password',
            role: 'OWNER',
          },
        ],
      };

      prismaMock.company.create.mockResolvedValue(createdCompany as any);

      // Act
      const result = await service.register(registerDto as any);

      // Assert
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: registerDto.companyName,
            users: expect.objectContaining({
              create: expect.objectContaining({
                name: registerDto.name,
                email: registerDto.email,
                passwordHash: 'hashed-password',
                role: 'OWNER',
              }),
            }),
          }),
        }),
      );
      expect(result).toHaveProperty('token');
      expect(result.user).toEqual({
        id: 'user-1',
        name: registerDto.name,
        email: registerDto.email,
        role: 'OWNER',
        companyId: 'company-1',
      });
    });

    it('devrait lancer ConflictException si l\'email existe déjà', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: registerDto.email,
      });

      // Act & Assert
      await expect(service.register(registerDto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.company.create).not.toHaveBeenCalled();
    });

    it('ne devrait JAMAIS stocker le mot de passe en clair', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value');

      prismaMock.company.create.mockResolvedValue({
        id: 'c1',
        name: 'Test',
        users: [
          {
            id: 'u1',
            name: 'Test',
            email: 'test@test.com',
            passwordHash: 'hashed-value',
            role: 'OWNER',
          },
        ],
      } as any);

      // Act
      await service.register(registerDto as any);

      // Assert — le mot de passe original ne doit pas figurer dans l'objet create
      const createCall = prismaMock.company.create.mock.calls[0][0];
      const serialized = JSON.stringify(createCall);
      expect(serialized).not.toContain(registerDto.password);
    });
  });

  // ─── login ───────────────────────────────────────────────────
  describe('login', () => {
    const loginDto = {
      email: 'jean@example.com',
      password: 'motdepasse123',
    };

    it('devrait retourner un token si les identifiants sont valides', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        role: 'SELLER',
        company: { id: 'company-1' },
      });

      mockedBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await service.login(loginDto as any);

      // Assert
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: { company: true },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        'hashed-password',
      );
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('devrait lancer UnauthorizedException si lutilisateur nexiste pas', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('devrait lancer UnauthorizedException si le mot de passe est incorrect', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        role: 'SELLER',
        company: { id: 'company-1' },
      });

      mockedBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('ne devrait pas révéler si lutilisateur ou le mot de passe est incorrect (message générique)', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Act
      let errorMessage = '';
      try {
        await service.login(loginDto as any);
      } catch (e: any) {
        errorMessage = e.message;
      }

      // Assert — le message ne doit pas indiquer si c'est l'email ou le mot de passe
      expect(errorMessage.toLowerCase()).not.toContain('utilisateur');
      expect(errorMessage).toContain('Email ou mot de passe incorrect');
    });
  });
});