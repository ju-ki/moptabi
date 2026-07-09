import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { testClient } from 'hono/testing';

import app from '..';
import {
  connectDb,
  disconnectDb,
  clearUserTestData,
  createTestUser,
  createPlanLocation,
  createUserLocation,
  deletePlanLocationByUser,
  deleteUserLocationByUser,
  clearTestDataForUser,
  createSpotWithMeta,
  createPlan,
  createTrip,
  createPlanSpot,
} from './db-helper';

// テスト用ユーザーID
const TEST_USER_ID = 'planLocation_api_test_user';
const OTHER_USER_ID = 'planLocation_api_other_user';
const SPOT_PREFIX = 'spot_api_';

// Spot IDを生成するヘルパー関数
function spotId(id: string): string {
  return `${SPOT_PREFIX}${id}`;
}

// 現在の認証ユーザーIDを保持する変数
let currentUserId: string | null = TEST_USER_ID;

// 認証ヘッダーを生成するヘルパー関数
function getAuthHeaders(): Record<string, string> {
  if (!currentUserId) {
    return {};
  }
  return { 'X-User-Id': currentUserId };
}

beforeAll(async () => {
  await connectDb();
  // テストデータのクリーンアップ
  await clearUserTestData(TEST_USER_ID);
  await clearUserTestData(OTHER_USER_ID);
  // テストユーザーを作成
  await createTestUser(TEST_USER_ID, 'USER');
  await createTestUser(OTHER_USER_ID, 'USER');
});

afterAll(async () => {
  await clearUserTestData(TEST_USER_ID);
  await clearUserTestData(OTHER_USER_ID);
  await disconnectDb();
});

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
  // 各テスト前にPlanLocationとUserLocationをクリア
  await clearTestDataForUser(TEST_USER_ID, SPOT_PREFIX);
  await deletePlanLocationByUser(TEST_USER_ID);
  await deletePlanLocationByUser(OTHER_USER_ID);
  await deleteUserLocationByUser(TEST_USER_ID);
  await deleteUserLocationByUser(OTHER_USER_ID);
});

describe('🧾 プラン作成時の出発地・目的地履歴APIテスト', () => {
  const client = testClient(app) as any;

  // ========================================
  // GET /api/plan-location/candidates - 候補取得
  // ========================================
  describe('GET /api/plan-location/candidates', () => {
    it('未認証の場合は401を返す', async () => {
      currentUserId = null;
      const response = await client.api['plan-location'].candidates.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(401);
    });

    it('お気に入りと履歴が両方空の場合', async () => {
      const response = await client.api['plan-location'].candidates.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.favorites).toEqual([]);
      expect(data.history).toEqual([]);
    });

    it('お気に入り地点が候補に含まれる', async () => {
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
        usageCount: 5,
        isDefault: true,
      });

      const response = await client.api['plan-location'].candidates.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.favorites.length).toBe(1);
      expect(data.favorites[0].name).toBe('自宅');
    });

    it('履歴地点が候補に含まれる', async () => {
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: TEST_USER_ID,
      });
      const plan1 = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
      await createPlanSpot({
        planId: plan1.id,
        spotId: spotId('1'),
        stayStart: '10:00',
        stayEnd: '11:00',
        order: 1,
      });
      await createPlanLocation({
        userId: TEST_USER_ID,
        name: '2025-01-15_出発地',
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
        usageCount: 3,
        planId: plan1.id,
      });

      const response = await client.api['plan-location'].candidates.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.history.length).toBe(1);
      expect(data.history[0].name).toBe('2025-01-15_出発地');
    });

    it('locationTypeでフィルタリングできる', async () => {
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: TEST_USER_ID,
      });
      const plan1 = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
      await createPlanSpot({
        planId: plan1.id,
        spotId: spotId('1'),
        stayStart: '10:00',
        stayEnd: '11:00',
        order: 1,
      });
      await createPlanLocation({
        userId: TEST_USER_ID,
        name: '出発地',
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
        planId: plan1.id,
      });
      await createPlanLocation({
        userId: TEST_USER_ID,
        name: '目的地',
        latitude: 35.6812,
        longitude: 139.7671,
        locationType: 'DESTINATION',
        planId: plan1.id,
      });

      const response = await client.api['plan-location'].candidates.$get(
        { query: { locationType: 'DEPARTURE' } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.history.length).toBe(1);
      expect(data.history[0].locationType).toBe('DEPARTURE');
    });

    it('limitで取得件数を制限できる', async () => {
      // 5件のUserLocationを作成
      for (let i = 0; i < 5; i++) {
        await createUserLocation({
          userId: TEST_USER_ID,
          name: `地点${i}`,
          latitude: 35.6895 + i * 0.01,
          longitude: 139.6917 + i * 0.01,
        });
      }

      const response = await client.api['plan-location'].candidates.$get(
        { query: { limit: '3' } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.favorites.length).toBe(3);
    });
  });
});
