import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { prismaMock } from './prisma.mock';

// On remplace le vrai PrismaService par un mock
jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => prismaMock),
}));

// Mock bcrypt pour les e2e
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('Auth & Security (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── AUTH ────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('devrait créer un compte et retourner un token', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.company.create.mockResolvedValue({
        id: 'company-1',
        name: 'Test SARL',
        users: [
          {
            id: 'user-1',
            name: 'Test',
            email: 'test@test.com',
            passwordHash: 'hashed',
            role: 'OWNER',
          },
        ],
      } as any);

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'test@test.com',
          password: 'Motdepasse1!',
          companyName: 'Test SARL',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@test.com');
      expect(response.body.user).toHaveProperty('role', 'OWNER');
    });

    it('devrait rejeter un email invalide (validation 400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'X',
          email: 'pas-un-email',
          password: '12345678',
          companyName: 'Y',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('devrait rejeter un mot de passe trop court (validation 400)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'X',
          email: 'ok@ok.com',
          password: '123',
          companyName: 'Y',
        })
        .expect(400);
    });

    it('devrait rejeter les champs supplémentaires (whitelist)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'X',
          email: 'ok@ok.com',
          password: 'Motdepasse1!',
          companyName: 'Y',
          role: 'OWNER', // ← ne devrait pas être accepté
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('devrait retourner un token si les identifiants sont bons', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'ok@ok.com',
        passwordHash: 'hashed',
        role: 'OWNER',
        company: { id: 'company-1' },
      } as any);
      mockedBcrypt.compare.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ok@ok.com', password: 'Motdepasse1!' })
        .expect(201);

      expect(response.body).toHaveProperty('token');
    });

    it('devrait retourner 401 si les identifiants sont mauvais', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ok@ok.com', password: 'Motdepasse1!' })
        .expect(401);
    });
  });

  // ─── SECURITE ENDPOINTS PROTEGES ─────────────────────────────
  describe('Sécurité — endpoints protégés', () => {
    it('GET /api/products sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/products')
        .expect(401);
    });

    it('GET /api/products avec token invalide → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('GET /api/sales sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/sales')
        .expect(401);
    });

    it('GET /api/stock-entries sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/stock-entries')
        .expect(401);
    });

    it('GET /api/stock-exits sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/stock-exits')
        .expect(401);
    });

    it('GET /api/reports/sales sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/sales')
        .expect(401);
    });

    it('GET /api/clients sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/clients')
        .expect(401);
    });
  });

  // ─── PROTECTION MULTI-TENANT ─────────────────────────────────
  describe('Isolation multi-tenant', () => {
    it('un utilisateur ne peut modifier que son propre profil', async () => {
      // Génère un token pour user-1, mais on tente de modifier user-2
      const jwtService = app.get(JwtService);
      const token = jwtService.sign({
        sub: 'user-1',
        email: 'u1@test.com',
        companyId: 'company-1',
        role: 'SELLER',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/users/user-2')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' });

      // Soit 500 (erreur), soit 403, soit 404 — mais JAMAIS 200
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(201);
    });
  });
});