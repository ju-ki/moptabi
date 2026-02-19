import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'bun:test';
import { testClient } from 'hono/testing';

import { APP_LIMITS, LIMIT_ERROR_MESSAGES } from '@/constants/limits';

import app from '..';
import {
  connectDb as connectPrisma,
  disconnectDb as disconnectPrisma,
  clearUserTestData as clearTestDataForUser,
  createTestUser,
  createSpotWithMeta,
  createWishlistEntry,
  deleteWishlistByUser,
  deleteTripsByUser,
  createTrip,
} from './db-helper';

// 認証用のモックユーザーID
const TEST_USER_ID = 'test_user_limits';

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
  await connectPrisma();
  await clearTestDataForUser(TEST_USER_ID);
  await createTestUser(TEST_USER_ID);
});

afterAll(async () => {
  await clearTestDataForUser(TEST_USER_ID);
  await disconnectPrisma();
});

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
  // 各テスト前にデータをクリア
  await deleteWishlistByUser(TEST_USER_ID);
  await deleteTripsByUser(TEST_USER_ID);
});

// 再利用するモックデータ
// API用: spotIdを含む
const createMockSpotMeta = (id: string) => ({
  id,
  spotId: id,
  name: `テストスポット_${id}`,
  latitude: 35.6622,
  longitude: 134.6622,
  image: 'https://example.com/image.jpg',
  rating: 4.2,
  categories: ['park'],
  url: 'https://example.com',
  prefecture: '東京都',
  address: '東京都千代田区千代田1-1',
  catchphrase: 'テスト用スポット',
  description: 'テスト用の説明文',
  openingHours: [{ day: '月', hours: '9:00-18:00' }],
});

// Prisma直接操作用: spotIdは不要（リレーションで解決）
const createMockSpotMetaForDB = (id: string) => ({
  id,
  name: `テストスポット_${id}`,
  latitude: 35.6622,
  longitude: 134.6622,
  image: 'https://example.com/image.jpg',
  rating: 4.2,
  categories: ['park'],
  url: 'https://example.com',
  prefecture: '東京都',
  address: '東京都千代田区千代田1-1',
  catchphrase: 'テスト用スポット',
  description: 'テスト用の説明文',
  openingHours: [{ day: '月', hours: '9:00-18:00' }],
});

const createMockWishlistPayload = (spotId: string) => ({
  spotId,
  priority: 3,
  memo: 'テストメモ',
  visited: 0,
  visitedAt: null,
  spot: {
    id: spotId,
    meta: createMockSpotMeta(spotId),
  },
});

describe('🔒 上限チェック機能', () => {
  const client = testClient(app) as any;

  describe('行きたいリストの上限チェック', () => {
    it(`上限（${APP_LIMITS.MAX_WISHLIST_SPOTS}件）に達している場合、新規登録が拒否される`, async () => {
      // 上限まで登録
      for (let i = 0; i < APP_LIMITS.MAX_WISHLIST_SPOTS; i++) {
        const spotId = `limit_test_spot_${i}`;
        await createSpotWithMeta(spotId, createMockSpotMetaForDB(spotId));
        await createWishlistEntry({
          userId: TEST_USER_ID,
          spotId,
          priority: 3,
          memo: 'テスト',
        });
      }

      // 上限を超える登録を試みる
      const response = await client.api.wishlist.$post(
        {
          json: createMockWishlistPayload('over_limit_spot'),
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(LIMIT_ERROR_MESSAGES.WISHLIST_LIMIT_EXCEEDED);
    });

    it('上限未満の場合は登録できる', async () => {
      const response = await client.api.wishlist.$post(
        {
          json: createMockWishlistPayload('normal_spot'),
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it('現在の登録数を取得できる', async () => {
      // 3件登録
      for (let i = 0; i < 3; i++) {
        const spotId = `count_test_spot_${i}`;
        await createSpotWithMeta(spotId, createMockSpotMetaForDB(spotId));
        await createWishlistEntry({
          userId: TEST_USER_ID,
          spotId,
          priority: 3,
          memo: 'テスト',
        });
      }

      const response = await client.api.wishlist.count.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.count).toBe(3);
      expect(result.limit).toBe(APP_LIMITS.MAX_WISHLIST_SPOTS);
    });
  });

  describe('プラン作成数の上限チェック', () => {
    it(`上限（${APP_LIMITS.MAX_PLANS}件）に達している場合、新規作成が拒否される`, async () => {
      // 上限まで作成
      for (let i = 0; i < APP_LIMITS.MAX_PLANS; i++) {
        await createTrip({
          userId: TEST_USER_ID,
          title: `テストプラン_${i}`,
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        });
      }

      // 上限を超える作成を試みる
      const response = await client.api.trips.create.$post(
        {
          json: {
            title: '超過プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-02',
            tripInfo: [
              {
                date: '2025-01-01',
                genreId: 1,
                transportationMethod: 1,
              },
            ],
            plans: [
              {
                date: '2025-01-01',
                spots: [],
              },
            ],
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(LIMIT_ERROR_MESSAGES.PLAN_LIMIT_EXCEEDED);
    });

    it('上限未満の場合は作成できる', async () => {
      const response = await client.api.trips.create.$post(
        {
          json: {
            title: '通常プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-02',
            tripInfo: [
              {
                date: '2025-01-01',
                genreId: 1,
                transportationMethod: 1,
              },
            ],
            plans: [
              {
                date: '2025-01-01',
                spots: [],
              },
            ],
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it('現在のプラン数を取得できる', async () => {
      // 5件作成
      for (let i = 0; i < 5; i++) {
        await createTrip({
          userId: TEST_USER_ID,
          title: `テストプラン_${i}`,
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        });
      }

      const response = await client.api.trips.count.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.count).toBe(5);
      expect(result.limit).toBe(APP_LIMITS.MAX_PLANS);
    });
  });

  describe('1日あたりのスポット数の上限チェック', () => {
    it(`上限（${APP_LIMITS.MAX_SPOTS_PER_DAY}件）を超えるスポットを含むプランは作成が拒否される`, async () => {
      // 上限を超えるスポットを持つプランを作成
      const spots = Array.from({ length: APP_LIMITS.MAX_SPOTS_PER_DAY + 1 }, (_, i) => ({
        id: `spot_${i}`,
        location: { id: `loc_${i}`, lat: 35.6812, lng: 139.7671, name: `スポット${i}` },
        stayStart: `${10 + i}:00`,
        stayEnd: `${11 + i}:00`,
        transports: {
          transportMethod: 1,
          name: 'TRANSIT',
          travelTime: '30 mins',
          fromType: 'SPOT',
          toType: 'SPOT',
        },
        order: i,
      }));

      const response = await client.api.trips.create.$post(
        {
          json: {
            title: 'スポット過多プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-01',
            tripInfo: [
              {
                date: '2025-01-01',
                genreId: 1,
                transportationMethod: 1,
              },
            ],
            plans: [
              {
                date: '2025-01-01',
                spots,
              },
            ],
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(LIMIT_ERROR_MESSAGES.SPOTS_PER_DAY_LIMIT_EXCEEDED);
    });

    it('上限以内のスポット数なら作成できる', async () => {
      // スポット数0のプランは作成できる
      const response = await client.api.trips.create.$post(
        {
          json: {
            title: '通常スポット数プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-01',
            tripInfo: [
              {
                date: '2025-01-01',
                genreId: 1,
                transportationMethod: 1,
              },
            ],
            plans: [
              {
                date: '2025-01-01',
                spots: [],
              },
            ],
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });
  });

  describe('プラン日数の上限チェック', () => {
    it(`上限（${APP_LIMITS.MAX_PLAN_DAYS}日）を超えるプランは作成が拒否される`, async () => {
      // 上限を超える日数のプランを作成
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-01');
      endDate.setDate(startDate.getDate() + APP_LIMITS.MAX_PLAN_DAYS); // 15日後 = 15日間

      const tripInfo = Array.from({ length: APP_LIMITS.MAX_PLAN_DAYS + 1 }, (_, i) => {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          genreId: 1,
          transportationMethod: 1,
        };
      });

      const plans = Array.from({ length: APP_LIMITS.MAX_PLAN_DAYS + 1 }, (_, i) => {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          spots: [],
        };
      });

      const response = await client.api.trips.create.$post(
        {
          json: {
            title: '長期プラン',
            startDate: '2025-01-01',
            endDate: endDate.toISOString().split('T')[0],
            tripInfo,
            plans,
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(LIMIT_ERROR_MESSAGES.PLAN_DAYS_LIMIT_EXCEEDED);
    });

    it('上限以内の日数なら作成できる', async () => {
      const response = await client.api.trips.create.$post(
        {
          json: {
            title: '通常日数プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-03',
            tripInfo: [
              { date: '2025-01-01', genreId: 1, transportationMethod: 1 },
              { date: '2025-01-02', genreId: 1, transportationMethod: 1 },
              { date: '2025-01-03', genreId: 1, transportationMethod: 1 },
            ],
            plans: [
              { date: '2025-01-01', spots: [] },
              { date: '2025-01-02', spots: [] },
              { date: '2025-01-03', spots: [] },
            ],
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });
  });
});
