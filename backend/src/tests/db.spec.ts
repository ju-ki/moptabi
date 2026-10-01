import { describe, expect, it, mock } from 'bun:test';
import { Context } from 'hono';
import { Pool } from 'pg';

import { getPostgresDb } from '@/db';
import { postgresDbLifecycle } from '@/middleware/db';

/**
 * Cloudflare Workers 上の Hono コンテキストを模したオブジェクトを作成
 * Workers ではリクエストをまたいで TCP 接続を使い回せないため、
 * env.DATABASE_URL と executionCtx がある状態をリクエストごとに再現する
 */
function createWorkersContext() {
  const waitUntil = mock((_promise: Promise<unknown>) => {});
  const c = {
    env: { DATABASE_URL: process.env.DATABASE_URL },
    executionCtx: { waitUntil, passThroughOnException: () => {} },
    req: { raw: new Request('http://localhost/trips') },
  } as unknown as Context;
  return { c, waitUntil };
}

/**
 * Node.js（ローカル・テスト）の Hono コンテキストを模したオブジェクトを作成
 * executionCtx を参照すると Hono は例外を投げるため、その挙動を再現する
 */
function createNodeContext() {
  return {
    env: undefined,
    get executionCtx() {
      throw new Error('This context has no ExecutionContext');
    },
    req: { raw: new Request('http://localhost/trips') },
  } as unknown as Context;
}

const getPool = (db: ReturnType<typeof getPostgresDb>) => (db as unknown as { $client: Pool }).$client;

describe('getPostgresDb', () => {
  describe('Cloudflare Workers 環境', () => {
    it('リクエストごとに別の接続プールを返すこと', () => {
      const first = createWorkersContext();
      const second = createWorkersContext();

      const firstPool = getPool(getPostgresDb(first.c));
      const secondPool = getPool(getPostgresDb(second.c));

      expect(firstPool).not.toBe(secondPool);
    });

    it('同じリクエスト内では同じ接続プールを返すこと', () => {
      const { c } = createWorkersContext();

      expect(getPool(getPostgresDb(c))).toBe(getPool(getPostgresDb(c)));
    });

    it('トランザクションを実行できること', async () => {
      const { c } = createWorkersContext();
      const db = getPostgresDb(c);

      const result = await db.transaction(async (tx) => {
        const rows = await tx.execute('select 1 as value');
        return rows.rows[0];
      });

      expect(result).toEqual({ value: 1 });
      await getPool(db).end();
    });
  });

  describe('Node.js 環境（ローカル・テスト）', () => {
    it('リクエストをまたいで同じ接続プールを使い回すこと', () => {
      const first = createNodeContext();
      const second = createNodeContext();

      expect(getPool(getPostgresDb(first))).toBe(getPool(getPostgresDb(second)));
    });
  });
});

describe('postgresDbLifecycle', () => {
  it('リクエスト内で作成した接続プールをレスポンス後に閉じること', async () => {
    const { c, waitUntil } = createWorkersContext();
    let pool: Pool | undefined;

    await postgresDbLifecycle(c, async () => {
      pool = getPool(getPostgresDb(c));
      await getPostgresDb(c).execute('select 1');
    });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(pool?.ended).toBe(true);
  });

  it('ハンドラーで例外が起きても接続プールを閉じること', async () => {
    const { c, waitUntil } = createWorkersContext();
    let pool: Pool | undefined;

    await expect(
      postgresDbLifecycle(c, async () => {
        pool = getPool(getPostgresDb(c));
        throw new Error('handler error');
      }),
    ).rejects.toThrow('handler error');

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(pool?.ended).toBe(true);
  });

  it('接続プールを作成していないリクエストでは何もしないこと', async () => {
    const { c, waitUntil } = createWorkersContext();

    await postgresDbLifecycle(c, async () => {});

    expect(waitUntil).not.toHaveBeenCalled();
  });

  it('Node.js 環境ではグローバルの接続プールを閉じないこと', async () => {
    const c = createNodeContext();
    let pool: Pool | undefined;

    await postgresDbLifecycle(c, async () => {
      pool = getPool(getPostgresDb(c));
    });

    expect(pool?.ended).toBe(false);
  });
});
