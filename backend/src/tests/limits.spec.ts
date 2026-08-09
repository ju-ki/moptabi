import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'bun:test';
import { testClient } from 'hono/testing';
import { PlanLocationType } from '@shared/planLocation/types';

import { APP_LIMITS, LIMIT_ERROR_MESSAGES } from '@/constants/limits';

import app from '..';
import {
  disconnectDb as disconnectPrisma,
  clearUserTestData as clearTestDataForUser,
  createTestUser,
  createSpotWithMeta,
  createWishlistEntry,
  deleteWishlistByUser,
  deleteTripsByUser,
  createTrip,
} from './db-helper';
import { mockPlanData, mockTripData } from './libs/data';
import { createSpotData } from './test-client';

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

const createBasePlanLocation = (locationType: 'DEPARTURE' | 'DESTINATION'): PlanLocationType => ({
  name: locationType === 'DEPARTURE' ? '出発地' : '目的地',
  latitude: 35.6762,
  longitude: 139.6503,
  locationType,
  time: '09:00',
  transportMethodId: 1,
  transportMethod: 'WALKING',
  travelTime: 15,
});

const createTripPayload = (
  params: Partial<{
    title: string;
    startDate: string;
    endDate: string;
    plans: Array<{
      date: string;
      spots: any[];
      departure: PlanLocationType;
      destination: PlanLocationType;
    }>;
  }> = {},
) => ({
  title: params.title ?? '通常プラン',
  startDate: params.startDate ?? '2025-01-01',
  endDate: params.endDate ?? '2025-01-01',

  plans: params.plans ?? [
    {
      date: '2025-01-01',
      spots: [],
      departure: createBasePlanLocation('DEPARTURE'),
      destination: createBasePlanLocation('DESTINATION'),
    },
  ],
});

const createTripForUpdateTest = async (client: any, title: string = '更新テスト用プラン') => {
  const createResponse = await client.api.trips.create.$post(
    {
      json: createTripPayload({ title, endDate: '2025-01-02' }),
    },
    { headers: getAuthHeaders() },
  );

  expect(createResponse.status).toBe(201);
  const createdTrip = await createResponse.json();
  return createdTrip.id as number;
};

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
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
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
          json: createTripPayload({ endDate: '2025-01-02' }),
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

    it('更新時も共通上限チェックにより、上限到達時は更新が拒否される', async () => {
      // 更新対象を先に1件作成
      const tripIdForUpdate = await createTripForUpdateTest(client);

      // 合計件数が上限になるまで作成
      for (let i = 1; i < APP_LIMITS.MAX_PLANS; i++) {
        await createTrip({
          userId: TEST_USER_ID,
          title: `テストプラン_${i}`,
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        });
      }

      const response = await client.api.trips[tripIdForUpdate].$patch(
        {
          json: createTripPayload({
            title: '更新後タイトル',
            endDate: '2025-01-02',
            plans: [
              {
                date: '2025-01-01',
                spots: [],
                departure: createBasePlanLocation('DEPARTURE'),
                destination: createBasePlanLocation('DESTINATION'),
              },
              {
                date: '2025-01-02',
                spots: [],
                departure: createBasePlanLocation('DEPARTURE'),
                destination: createBasePlanLocation('DESTINATION'),
              },
            ],
          }),
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(LIMIT_ERROR_MESSAGES.PLAN_LIMIT_EXCEEDED);
    });
  });

  describe('1日あたりのスポット数の上限チェック', () => {
    it(`上限（${APP_LIMITS.MAX_SPOTS_PER_DAY}件）を超えるスポットを含むプランは作成が拒否される`, async () => {
      // 上限を超えるスポットを持つプランを作成
      const spots = Array.from({ length: APP_LIMITS.MAX_SPOTS_PER_DAY + 1 }, (_, i) => ({
        ...createSpotData(`spot_${i}`),
      }));

      const response = await client.api.trips.create.$post(
        {
          json: {
            title: 'スポット過多プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-01',
            plans: [
              {
                ...mockPlanData[0],
                spots
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
          json: createTripPayload({ title: '通常スポット数プラン' }),
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it(`更新時も共通上限チェックにより、上限（${APP_LIMITS.MAX_SPOTS_PER_DAY}件）を超えるスポットは拒否される`, async () => {
      const tripIdForUpdate = await createTripForUpdateTest(client);
      const spots = Array.from({ length: APP_LIMITS.MAX_SPOTS_PER_DAY + 1 }, (_, i) => ({
        ...createSpotData(`updated_spot_${i}`),
      }));

      const response = await client.api.trips[tripIdForUpdate].$patch(
        {
          json: createTripPayload({
            title: '更新スポット過多プラン',
            plans: [
              {
                ...mockPlanData[0],
                date: '2025-01-01',
                spots,
                departure: createBasePlanLocation('DEPARTURE'),
                destination: createBasePlanLocation('DESTINATION'),
              },
              {
                ...mockPlanData[0],
                date: '2025-01-02',
                spots: [],
                departure: createBasePlanLocation('DEPARTURE'),
                destination: createBasePlanLocation('DESTINATION'),
              },
            ],
            endDate: '2025-01-02',
          }),
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(LIMIT_ERROR_MESSAGES.SPOTS_PER_DAY_LIMIT_EXCEEDED);
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
          ...mockPlanData[0],
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
          json: createTripPayload({
            title: '通常日数プラン',
            endDate: '2025-01-03',

            plans: [
              {
                date: '2025-01-01',
                spots: [],
                departure: createBasePlanLocation('DEPARTURE'),
                destination: createBasePlanLocation('DESTINATION'),
              },
              {
                date: '2025-01-02',
                spots: [],
                departure: createBasePlanLocation('DEPARTURE'),
                destination: createBasePlanLocation('DESTINATION'),
              },
              {
                date: '2025-01-03',
                spots: [],
                departure: createBasePlanLocation('DEPARTURE'),
                destination: createBasePlanLocation('DESTINATION'),
              },
            ],
          }),
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it(`更新時も共通上限チェックにより、上限（${APP_LIMITS.MAX_PLAN_DAYS}日）を超える日数は拒否される`, async () => {
      const tripIdForUpdate = await createTripForUpdateTest(client);

      const endDate = new Date('2025-01-01');
      endDate.setDate(endDate.getDate() + APP_LIMITS.MAX_PLAN_DAYS);

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
          departure: createBasePlanLocation('DEPARTURE'),
          destination: createBasePlanLocation('DESTINATION'),
        };
      });

      const response = await client.api.trips[tripIdForUpdate].$patch(
        {
          json: createTripPayload({
            title: '更新長期プラン',
            endDate: endDate.toISOString().split('T')[0],
            plans,
          }),
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(LIMIT_ERROR_MESSAGES.PLAN_DAYS_LIMIT_EXCEEDED);
    });
  });
});
