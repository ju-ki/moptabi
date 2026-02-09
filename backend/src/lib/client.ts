import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '@/generated/prisma/client';

// グローバル変数の型定義
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// PrismaClientの作成関数
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL;
  const isTestEnv = process.env.NODE_ENV === 'test';

  // テスト環境またはPostgreSQL URLの場合はPrismaPgアダプターを使用
  if (isTestEnv || (databaseUrl && databaseUrl.startsWith('postgresql://'))) {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }
    // グローバルプールを再利用
    if (!globalForPrisma.pool) {
      globalForPrisma.pool = new Pool({
        connectionString: databaseUrl,
      });
    }
    const adapter = new PrismaPg(globalForPrisma.pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // Prisma Postgres用（本番環境）
  // @ts-expect-error accelerateUrlはまだ型定義にない
  return new PrismaClient({
    accelerateUrl: databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// PrismaClientインスタンスの作成または取得
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// development/test環境でのみグローバルに保存（ホットリロード対応）
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 型を再エクスポート（生成されたクライアントから）
export type { PrismaClient } from '@/generated/prisma/client';
