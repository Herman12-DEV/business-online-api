import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── CORS restrictif ────────────────────────────────────
  // Origine autorisée en prod via env, ou localhost par défaut
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:8081')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      // Pas d'origine (apps mobiles natives, Postman) → autorise
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origine non autorisée par CORS'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Headers de sécurité ────────────────────────────────
  // (Helmet simplifié — sans dépendance externe)
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );
    next();
  });

  // ── Préfixe global ─────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation stricte des DTOs ────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Sécurité JWT ───────────────────────────────────────
  if (!process.env.JWT_SECRET) {
    Logger.warn(
      '⚠️  JWT_SECRET non défini — fallback sur secret-dev (NE PAS UTILISER EN PRODUCTION)',
      'Bootstrap',
    );
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`API démarrée sur http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();