/**
 * Mock PrismaService pour les tests unitaires.
 * Chaque méthode renvoie un Jest mock que l'on peut configurer
 * dans chaque test avec `prismaMock.user.findUnique.mockResolvedValue(...)`.
 */
import { PrismaService } from '../src/prisma/prisma.service';

export type DeepMock<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? jest.Mock<ReturnType<T[P]>, Parameters<T[P]>>
    : T[P] extends Promise<any>
      ? jest.Mock<ReturnType<T[P]>, Parameters<T[P]>>
      : DeepMock<T[P]>;
};

const createPrismaMock = (): DeepMock<PrismaService> => {
  const mock = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((cb: any) => cb(mock)),
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    sale: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    saleItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    stockEntry: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    stockEntryItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    stockExit: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as any;
  };
  return mock;
};

// Singleton — un seul mock partagé pour que $transaction puisse se référer à lui-même
export const prismaMock = createPrismaMock();

// Reset tous les mocks entre les tests (récursif sur les sous-objets)
export function resetPrismaMock(): void {
  function reset(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj.mockReset === 'function') {
      obj.mockReset();
      return;
    }
    for (const key of Object.keys(obj)) {
      reset(obj[key]);
    }
  }
  reset(prismaMock);
}