import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'bun:test';
import { testClient } from 'hono/testing';
import { PlanLocationType } from '@shared/planlocation/types';
import { DEFAULT_USER_LIMITS, buildLimitErrorMessage } from '@shared/user/types';

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
  upsertUserLimit,
} from './db-helper';
import { mockPlanData, mockTripData } from './libs/data';
import { createSpotData } from './test-client';

const TEST_USER_ID = 'test_user_limits';
const OTHER_USER_ID = 'test_user_limits_other';

let currentUserId: string | null = TEST_USER_ID;

function getAuthHeaders(): Record<string, string> {
  if (!currentUserId) return {};
  return { 'X-User-Id': currentUserId };
}

function getOtherAuthHeaders(): Record<string, string> {
  return { 'X-User-Id': OTHER_USER_ID };
}

beforeAll(async () => {
  await clearTestDataForUser(TEST_USER_ID);
  await clearTestDataForUser(OTHER_USER_ID);
  await createTestUser(TEST_USER_ID);
  await createTestUser(OTHER_USER_ID);
  // テストユーザーにデフォルト上限を設定
  await upsertUserLimit(TEST_USER_ID);
  await upsertUserLimit(OTHER_USER_ID);
});

afterAll(async () => {
  await clearTestDataForUser(TEST_USER_ID);
  await clearTestDataForUser(OTHER_USER_ID);
  await disconnectPrisma();
});

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
  await deleteWishlistByUser(TEST_USER_ID);
  await deleteWishlistByUser(OTHER_USER_ID);
  await deleteTripsByUser(TEST_USER_ID);
  await deleteTripsByUser(OTHER_USER_ID);
  await upsertUserLimit(TEST_USER_ID);
  await upsertUserLimit(OTHER_USER_ID);
});

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

const createMockSpotMeta = (id: string) => ({
  id,
  spotId: id,
  name: `テストスポット_${id}`,
  latitude: 35.6622,
  longitude: 134.6622,
  rating: 4.2,
  categories: ['park'],
  image: 'https://example.com/image.jpg',
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
  spot: { id: spotId, meta: createMockSpotMeta(spotId) },
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
    { json: createTripPayload({ title, endDate: '2025-01-02' }) },
    { headers: getAuthHeaders() },
  );
  expect(createResponse.status).toBe(201);
  const createdTrip = await createResponse.json();
  return createdTrip.id as number;
};

describe('🔒 上限チェック機能', () => {
  const client = testClient(app) as any;

  describe('行きたいリストの上限チェック', () => {
    it('件数 = 上限 − 1 の場合登録できる (B-9)', async () => {
      for (let i = 0; i < DEFAULT_USER_LIMITS.maxWishlistSpots - 1; i++) {
        const spotId = `limit_test_spot_${i}`;
        await createSpotWithMeta(spotId, createMockSpotMetaForDB(spotId));
        await createWishlistEntry({ userId: TEST_USER_ID, spotId, priority: 3, memo: 'テスト' });
      }
      const newSpotId = 'one_before_limit_spot';
      await createSpotWithMeta(newSpotId, createMockSpotMetaForDB(newSpotId));

      const response = await client.api.wishlist.$post(
        { json: createMockWishlistPayload(newSpotId) },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it('件数 = 上限 の場合、400とエラーメッセージを返す (B-10)', async () => {
      for (let i = 0; i < DEFAULT_USER_LIMITS.maxWishlistSpots; i++) {
        const spotId = `limit_test_spot_${i}`;
        await createSpotWithMeta(spotId, createMockSpotMetaForDB(spotId));
        await createWishlistEntry({ userId: TEST_USER_ID, spotId, priority: 3, memo: 'テスト' });
      }

      const response = await client.api.wishlist.$post(
        { json: createMockWishlistPayload('over_limit_spot') },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(buildLimitErrorMessage('wishlist', DEFAULT_USER_LIMITS.maxWishlistSpots));
    });

    it('行きたいリスト件数取得でlimitがユーザーの上限値になる (B-11)', async () => {
      for (let i = 0; i < 3; i++) {
        const spotId = `count_test_spot_${i}`;
        await createSpotWithMeta(spotId, createMockSpotMetaForDB(spotId));
        await createWishlistEntry({ userId: TEST_USER_ID, spotId, priority: 3, memo: 'テスト' });
      }

      const response = await client.api.wishlist.count.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.count).toBe(3);
      expect(result.limit).toBe(DEFAULT_USER_LIMITS.maxWishlistSpots);
    });

    it('上限値の個別性: ユーザーAは追加でき、ユーザーBは拒否される (B-19)', async () => {
      // ユーザーBはデフォルト上限（20件）
      for (let i = 0; i < DEFAULT_USER_LIMITS.maxWishlistSpots; i++) {
        const spotId = `b_limit_spot_${i}`;
        await createSpotWithMeta(spotId, createMockSpotMetaForDB(spotId));
        await createWishlistEntry({ userId: OTHER_USER_ID, spotId, priority: 3, memo: 'テスト' });
      }

      // ユーザーAは上限30件に設定
      await upsertUserLimit(TEST_USER_ID, { maxWishlistSpots: 30 });
      const newSpotId = 'a_can_add_spot';
      await createSpotWithMeta(newSpotId, createMockSpotMetaForDB(newSpotId));

      const responseA = await client.api.wishlist.$post(
        { json: createMockWishlistPayload(newSpotId) },
        { headers: getAuthHeaders() },
      );
      expect(responseA.status).toBe(201);

      const responseB = await client.api.wishlist.$post(
        { json: createMockWishlistPayload('b_blocked_spot') },
        { headers: getOtherAuthHeaders() },
      );
      expect(responseB.status).toBe(400);
    });
  });

  describe('プラン作成数の上限チェック', () => {
    it('件数 = 上限 − 1 の場合作成できる (B-12a)', async () => {
      for (let i = 0; i < DEFAULT_USER_LIMITS.maxPlans - 1; i++) {
        await createTrip({
          userId: TEST_USER_ID,
          title: `テストプラン_${i}`,
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        });
      }

      const response = await client.api.trips.create.$post(
        { json: createTripPayload({ endDate: '2025-01-02' }) },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it('件数 = 上限 の場合400を返す (B-12b)', async () => {
      for (let i = 0; i < DEFAULT_USER_LIMITS.maxPlans; i++) {
        await createTrip({
          userId: TEST_USER_ID,
          title: `テストプラン_${i}`,
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        });
      }

      const response = await client.api.trips.create.$post(
        { json: { ...structuredClone(mockTripData), plans: structuredClone(mockPlanData) } },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(buildLimitErrorMessage('plans', DEFAULT_USER_LIMITS.maxPlans));
    });

    it('上限到達時でも既存プランは更新できる (B-13/Q5)', async () => {
      const tripIdForUpdate = await createTripForUpdateTest(client);

      for (let i = 1; i < DEFAULT_USER_LIMITS.maxPlans; i++) {
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

      expect(response.status).toBe(200);
    });

    it('プラン件数取得でlimitがユーザーの上限値になる (B-14)', async () => {
      for (let i = 0; i < 2; i++) {
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
      expect(result.count).toBe(2);
      expect(result.limit).toBe(DEFAULT_USER_LIMITS.maxPlans);
    });
  });

  describe('プラン日数の上限チェック', () => {
    it('日数 = 上限 の場合保存できる (B-15a)', async () => {
      const plans = Array.from({ length: DEFAULT_USER_LIMITS.maxPlanDays }, (_, i) => {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          spots: [],
          departure: createBasePlanLocation('DEPARTURE'),
          destination: createBasePlanLocation('DESTINATION'),
        };
      });
      const endDate = new Date('2025-01-01');
      endDate.setDate(endDate.getDate() + DEFAULT_USER_LIMITS.maxPlanDays - 1);

      const response = await client.api.trips.create.$post(
        {
          json: {
            title: '上限日数プラン',
            startDate: '2025-01-01',
            endDate: endDate.toISOString().split('T')[0],
            plans,
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it('日数 = 上限 + 1 の場合400を返す (B-15b)', async () => {
      const plans = Array.from({ length: DEFAULT_USER_LIMITS.maxPlanDays + 1 }, (_, i) => {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          spots: [],
          departure: createBasePlanLocation('DEPARTURE'),
          destination: createBasePlanLocation('DESTINATION'),
        };
      });
      const endDate = new Date('2025-01-01');
      endDate.setDate(endDate.getDate() + DEFAULT_USER_LIMITS.maxPlanDays);

      const response = await client.api.trips.create.$post(
        { json: { title: '長期プラン', startDate: '2025-01-01', endDate: endDate.toISOString().split('T')[0], plans } },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(buildLimitErrorMessage('planDays', DEFAULT_USER_LIMITS.maxPlanDays));
    });
  });

  describe('1日あたりのスポット数の上限チェック', () => {
    it('スポット数 = 上限 の場合保存できる (B-16a)', async () => {
      const spots = Array.from({ length: DEFAULT_USER_LIMITS.maxSpotsPerDay }, (_, i) => ({
        ...createSpotData(`spot_at_limit_${i}`),
      }));

      const response = await client.api.trips.create.$post(
        {
          json: {
            title: '上限スポット数プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-01',
            plans: [{ ...mockPlanData[0], spots }],
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(201);
    });

    it('スポット数 = 上限 + 1 の場合400を返す (B-16b)', async () => {
      const spots = Array.from({ length: DEFAULT_USER_LIMITS.maxSpotsPerDay + 1 }, (_, i) => ({
        ...createSpotData(`spot_over_${i}`),
      }));

      const response = await client.api.trips.create.$post(
        {
          json: {
            title: 'スポット過多プラン',
            startDate: '2025-01-01',
            endDate: '2025-01-01',
            plans: [{ ...mockPlanData[0], spots }],
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe(buildLimitErrorMessage('spotsPerDay', DEFAULT_USER_LIMITS.maxSpotsPerDay));
    });
  });
});
