import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '@/generated/prisma/client';

// PostgreSQL接続プールを作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma Pg Adapterを作成
const adapter = new PrismaPg(pool);

// PrismaClientの作成関数
const createPrismaClient = () => {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// グローバル変数の型定義
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PrismaClientインスタンスの作成または取得
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// development環境でのみグローバルに保存（ホットリロード対応）
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 型を再エクスポート（生成されたクライアントから）
