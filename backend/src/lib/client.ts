import { PrismaClient } from '@/generated/prisma';

// グローバル変数の型定義
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PrismaClientインスタンスの作成または取得
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// development環境でのみグローバルに保存（ホットリロード対応）
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 型を再エクスポート
export * from '@prisma/client';
