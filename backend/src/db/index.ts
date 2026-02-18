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
const isProduction = process.env.NODE_ENV === 'production';

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

/**
 * 環境に応じてDBインスタンスを取得
 * 本番環境: Cloudflare Workers環境変数からDATABASE_URLを取得してNeon HTTP接続
 * 開発/テスト環境: node-postgres接続
 */
export const getDbFromEnv = (env?: { DATABASE_URL?: string }): AnyDbType => {
  if (isProduction) {
    const databaseUrl = env?.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required in production');
    }
    return createDbForWorkers(databaseUrl);
  }
  return getDb();
};

/**
 * Honoコンテキストからリクエストスコープのデータベース接続を取得
 * 本番環境: c.env.DATABASE_URL を使用
 * 開発/テスト環境: グローバルな node-postgres 接続を使用
 */
export const getDbFromContext = (c: Context): AnyDbType => {
  // コンテキストに既にDBが設定されている場合はそれを返す
  const existingDb = c.get('db');
  if (existingDb) {
    return existingDb as AnyDbType;
  }

  // 本番環境の場合はenv から取得
  if (isProduction) {
    const env = c.env as { DATABASE_URL?: string };
    return getDbFromEnv(env);
  }

  // 開発/テスト環境
  return getDb();
};

/**
 * リクエストスコープのDBを設定（ミドルウェアから呼び出される）
 */
export const setRequestScopeDb = (database: AnyDbType): void => {
  globalForDb.currentRequestDb = database;
};

/**
 * リクエストスコープのDBをクリア（リクエスト終了時に呼び出される）
 */
export const clearRequestScopeDb = (): void => {
  globalForDb.currentRequestDb = undefined;
};

/**
 * 現在のリクエストスコープのDBを取得
 * サービス層からの後方互換性のあるアクセス用
 */
export const getCurrentDb = (): AnyDbType => {
  // 本番環境の場合、リクエストスコープのDBを返す
  if (isProduction) {
    if (!globalForDb.currentRequestDb) {
      throw new Error('Database not initialized. Make sure the request passes through the DB middleware.');
    }
    return globalForDb.currentRequestDb;
  }
  // 開発/テスト環境の場合、通常のDBを返す
  return getDb();
};

// 開発/テスト環境用のデフォルトエクスポート（後方互換性のため）
// 本番環境ではProxyを使用してリクエストスコープのDBにアクセス
const createDbProxy = (): DbType => {
  return new Proxy({} as DbType, {
    get(_target, prop) {
      const currentDb = getCurrentDb();
      return (currentDb as Record<string | symbol, unknown>)[prop];
    },
  });
};

export const db: DbType = isProduction ? createDbProxy() : getDb();

// スキーマとリレーションを再エクスポート
export * from './schema';
export * from './relations';
