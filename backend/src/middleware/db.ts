import { Context, Next } from 'hono';

import { closeRequestPostgresDb } from '@/db';

/**
 * DB接続のライフサイクル管理ミドルウェア
 * getPostgresDb がリクエスト内で作成した接続プールを、レスポンス後（例外時も含む）に閉じる
 */
export const postgresDbLifecycle = async (c: Context, next: Next) => {
  try {
    await next();
  } finally {
    closeRequestPostgresDb(c);
  }
};
