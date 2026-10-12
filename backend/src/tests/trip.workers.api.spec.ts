import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';

import app from '..';
import { clearUserTestData, createTestUser, deleteTripsByUser } from './db-helper';
import { createAuthHeaders } from './test-client';
import { mockPlanData, mockTripData } from './libs/data';

const TEST_USER_ID = 'trip_workers_api_test_user';

type WorkersExecutionContext = NonNullable<Parameters<typeof app.request>[3]>;

/**
 * Cloudflare Workers と同じく env.DATABASE_URL と executionCtx を渡してリクエストする
 * waitUntil に渡された処理（接続プールの終了）をリクエストごとに確認できるようにする
 */
async function requestOnWorkers(path: string, method: 'POST' | 'PATCH', body: unknown) {
  const waitUntil = mock((promise: Promise<unknown>) => void promise);
  const executionCtx: WorkersExecutionContext = { waitUntil, passThroughOnException: () => {} };
  const res = await app.request(
    path,
    {
      method,
      headers: { ...createAuthHeaders(TEST_USER_ID), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { DATABASE_URL: process.env.DATABASE_URL },
    executionCtx,
  );
  return { res, waitUntil };
}

const createTripBody = () => ({ ...structuredClone(mockTripData), plans: structuredClone(mockPlanData) });

beforeAll(async () => {
  await clearUserTestData(TEST_USER_ID);
  await createTestUser(TEST_USER_ID, 'ADMIN');
});

afterAll(async () => {
  await deleteTripsByUser(TEST_USER_ID);
  await clearUserTestData(TEST_USER_ID);
});

describe('Cloudflare Workers 環境での旅行計画の作成・更新', () => {
  describe('POST /api/trips/create', () => {
    it('作成後にリクエスト専用の接続プールを閉じること', async () => {
      const { res, waitUntil } = await requestOnWorkers('/api/trips/create', 'POST', createTripBody());

      expect(res.status).toBe(201);
      expect(waitUntil).toHaveBeenCalledTimes(1);
      await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
    });
  });

  describe('PATCH /api/trips/:id', () => {
    it('連続で更新しても毎回成功し、リクエストごとに接続プールを閉じること', async () => {
      const { res: created } = await requestOnWorkers('/api/trips/create', 'POST', createTripBody());
      const { id } = (await created.json()) as { id: number };

      for (const title of ['1回目の更新', '2回目の更新', '3回目の更新']) {
        const { res, waitUntil } = await requestOnWorkers(`/api/trips/${id}`, 'PATCH', {
          ...createTripBody(),
          id,
          title,
        });

        expect(res.status).toBe(200);
        expect(waitUntil).toHaveBeenCalledTimes(1);
        await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
      }
    });
  });
});
