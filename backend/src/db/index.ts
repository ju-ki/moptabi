import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

import * as schema from './schema';
import * as relations from './relations';

// スキーマとリレーションを結合
const fullSchema = { ...schema, ...relations };

// 環境判定
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// DB型定義
type DbType = ReturnType<typeof drizzlePg<typeof fullSchema>>;

// グローバル変数でDB接続を保持（開発/テスト環境用）
const globalForDb = globalThis as unknown as {
  db: DbType | undefined;
  pool: Pool | undefined;
};

/**
 * Cloudflare Workers用のDB作成（HTTP経由）
 * Neon Serverless Driverを使用
 */
export const createDbForWorkers = (databaseUrl: string) => {
  const sql = neon(databaseUrl);
  return drizzleHttp(sql, { schema: fullSchema });
};

/**
 * 開発/テスト環境用のDB作成（node-postgres使用）
 */
const createDevDb = (): DbType => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: databaseUrl });
  }

  return drizzlePg(globalForDb.pool, { schema: fullSchema });
};

/**
 * DBインスタンスを取得
 */
export const getDb = (): DbType => {
  if (isProduction) {
    throw new Error('Use createDbForWorkers in production');
  }

  if (!globalForDb.db) {
    globalForDb.db = createDevDb();
  }
  return globalForDb.db;
};

// 開発/テスト環境用のデフォルトエクスポート
export const db: DbType = isProduction ? (null as unknown as DbType) : getDb();

// スキーマとリレーションを再エクスポート
export * from './schema';
export * from './relations';
