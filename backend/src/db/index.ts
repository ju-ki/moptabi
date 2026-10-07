import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import { Context } from 'hono';

import * as schema from './schema';
import * as relations from './relations';

// スキーマとリレーションを結合
const fullSchema = { ...schema, ...relations };

// 環境判定
const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

// DB型定義
type DbType = ReturnType<typeof drizzlePg<typeof fullSchema>>;
type DbHttpType = ReturnType<typeof drizzleHttp<typeof fullSchema>>;
export type AnyDbType = DbType | DbHttpType;

// グローバル変数でDB接続を保持（開発/テスト環境用）
const globalForDb = globalThis as unknown as {
  db: DbType | undefined;
  pool: Pool | undefined;
  // 本番環境用：リクエストスコープのDB接続
  currentRequestDb: AnyDbType | undefined;
};

/**
 * Cloudflare Workers用のDB作成（HTTP経由）
 * Neon Serverless Driverを使用
 */
export const createDbForWorkers = (databaseUrl: string): DbHttpType => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const sql = neon(databaseUrl);

  if (!globalForDb.currentRequestDb) {
    globalForDb.currentRequestDb = drizzleHttp(sql, { schema: fullSchema });
  }
  return drizzleHttp(sql, { schema: fullSchema });
};

/**
 * ローカル環境やトランザクションが発生する際はこちらを使用（node-postgres使用）
 */
export const createDevDb = (databaseUrl: string): DbType => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: databaseUrl });
  }

  return drizzlePg(globalForDb.pool, { schema: fullSchema });
};

// Cloudflare Workers用：リクエストごとの node-postgres 接続プール
// Workers ではあるリクエストで開いた接続を別のリクエストから使えないため、グローバルに保持しない
const requestPools = new WeakMap<Request, Pool>();

/**
 * Cloudflare Workers 上で実行されているか（executionCtx を持つか）を判定
 * Node.js 上の Hono は executionCtx を参照すると例外を投げる
 */
const hasExecutionCtx = (c: Context): boolean => {
  try {
    return Boolean(c.executionCtx);
  } catch {
    return false;
  }
};

/**
 * 意図的にPostgreSqlを使いたい場合に使用(対話型等)
 * 基本はgetDbFromContext
 * Workers 上ではリクエスト専用の接続プールを返す（postgresDbLifecycle でレスポンス後に閉じる）
 */
export const getPostgresDb = (c: Context): AnyDbType => {
  if (c && c.env && c.env.DATABASE_URL && hasExecutionCtx(c)) {
    let pool = requestPools.get(c.req.raw);
    if (!pool) {
      pool = new Pool({ connectionString: c.env.DATABASE_URL });
      requestPools.set(c.req.raw, pool);
    }
    return drizzlePg(pool, { schema: fullSchema });
  }

  if (c && c.env && c.env.DATABASE_URL) {
    return createDevDb(c.env.DATABASE_URL);
  }

  const databaseUrl = process.env.DATABASE_URL || '';

  return createDevDb(databaseUrl);
};

/**
 * getPostgresDb で作成したリクエスト専用の接続プールを閉じる
 * レスポンスを返した後に終了させるため waitUntil に渡す
 */
export const closeRequestPostgresDb = (c: Context): void => {
  const pool = requestPools.get(c.req.raw);
  if (!pool) {
    return;
  }
  requestPools.delete(c.req.raw);
  c.executionCtx.waitUntil(pool.end());
};

/**
 * Honoコンテキストからリクエストスコープのデータベース接続を取得
 * 本番環境: c.env.DATABASE_URL を使用
 * 開発/テスト環境: グローバルな node-postgres 接続を使用
 */
export const getDbFromContext = (c: Context): AnyDbType => {
  if (globalForDb.currentRequestDb) {
    return globalForDb.currentRequestDb;
  }

  if (c && c.env && c.env.DATABASE_URL) {
    return createDbForWorkers(c.env.DATABASE_URL);
  }

  const databaseUrl = process.env.DATABASE_URL || '';

  if (globalForDb.db) {
    return globalForDb.db;
  }
  // 基本的に本番環境は Cloudflare Workers で動作する想定なので、リクエストスコープのDB接続を返す
  if (isProduction) {
    return createDbForWorkers(databaseUrl);
  }

  return createDevDb(databaseUrl);
};

// スキーマとリレーションを再エクスポート
export * from './schema';
export * from './relations';
