// Global Jest setup — configured via setupFilesAfterEnv in jest.config.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://user:password@localhost:5432/business_online_test';