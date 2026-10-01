import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import { testClient } from 'hono/testing';

import app from '..';
import { clearUserTestData, createTestUser, deleteTripsByUser } from './db-helper';
import { createAuthHeaders } from './test-client';
import { mockPlanData, mockTripData } from './libs/data';

const TEST_USER_ID = 'trip_workers_api_test_user';

/**
 * Cloudflare Workers と同じく env.DATABASE_URL と executionCtx を渡したクライアントを作成
 * waitUntil に渡された処理（接続プールの終了）をリクエストごとに確認できるようにする
 */
function createWorkersClient() {
  const waitUntil = mock((_promise: Promise<unknown>) => {});
  const client = testClient(app, { DATABASE_URL: process.env.DATABASE_URL }, {
    waitUntil,
    passThroughOnException: () => {},
  } as any) as any;
  return { client, waitUntil };
}

beforeAll(async () => {
  await clearUserTestData(TEST_USER_ID);
  await createTestUser(TEST_USER_ID, 'ADMIN');
});

afterAll(async () => {
  await deleteTripsByUser(TEST_USER_ID);
  await clearUserTestData(TEST_USER_ID);
});

describe('Cloudflare Workers 環境での旅行計画の作成・更新', () => {
  describe('POST /trips/create', () => {
    it('作成後にリクエスト専用の接続プールを閉じること', async () => {
      const { client, waitUntil } = createWorkersClient();

      const res = await client.api.trips.create.$post(
        { json: { ...structuredClone(mockTripData), plans: structuredClone(mockPlanData) } },
        { headers: createAuthHeaders(TEST_USER_ID) },
      );

      expect(res.status).toBe(201);
      expect(waitUntil).toHaveBeenCalledTimes(1);
      await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
    });
  });

  describe('PATCH /trips/:id', () => {
    it('連続で更新しても毎回成功し、リクエストごとに接続プールを閉じること', async () => {
      const { client: createClient } = createWorkersClient();
      const created = await createClient.api.trips.create.$post(
        { json: { ...structuredClone(mockTripData), plans: structuredClone(mockPlanData) } },
        { headers: createAuthHeaders(TEST_USER_ID) },
      );
      const { id } = await created.json();

      for (const title of ['1回目の更新', '2回目の更新', '3回目の更新']) {
        const { client, waitUntil } = createWorkersClient();
        const res = await client.api.trips[id].$patch(
          { json: { ...structuredClone(mockTripData), id, title, plans: structuredClone(mockPlanData) } },
          { headers: createAuthHeaders(TEST_USER_ID) },
        );

        expect(res.status).toBe(200);
        expect(waitUntil).toHaveBeenCalledTimes(1);
        await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
      }
    });
  });
});
