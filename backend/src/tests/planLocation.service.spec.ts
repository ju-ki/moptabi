import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';

import { getPlanLocationCandidates, createOrUpdatePlanLocation, deletePlanLocation } from '@/services/planLocation';

import {
  connectDb,
  disconnectDb,
  clearUserTestData,
  createTestUser,
  createPlanLocation,
  createUserLocation,
  deletePlanLocationByUser,
  deleteUserLocationByUser,
  findPlanLocationById,
  countPlanLocations,
  createTrip,
  createPlan,
  createSpotWithMeta,
  createPlanSpot,
  clearTestDataForUser,
} from './db-helper';

// テスト用ユーザーID
const TEST_USER_ID = 'planLocation_service_test_user';
const OTHER_USER_ID = 'planLocation_service_other_user';
const SPOT_PREFIX = 'spot_api_';

// Spot IDを生成するヘルパー関数
function spotId(id: string): string {
  return `${SPOT_PREFIX}${id}`;
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
  // 各テスト前にPlanLocationとUserLocationをクリア
  await clearTestDataForUser(TEST_USER_ID, SPOT_PREFIX);
  await deletePlanLocationByUser(TEST_USER_ID);
  await deletePlanLocationByUser(OTHER_USER_ID);
  await deleteUserLocationByUser(TEST_USER_ID);
  await deleteUserLocationByUser(OTHER_USER_ID);
});

describe('🧪 PlanLocationサービス層テスト', () => {
  // ========================================
  // getPlanLocationCandidates - 候補取得
  // ========================================
  describe('getPlanLocationCandidates', () => {
    it('お気に入り（UserLocation）と履歴（PlanLocation）の両方を返す', async () => {
      // お気に入り地点を作成
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
        label: '自宅',
        isDefault: true,
      });

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
      // 履歴を作成
      await createPlanLocation({
        userId: TEST_USER_ID,
        name: '過去の出発地',
        latitude: 35.6812,
        longitude: 139.7671,
        locationType: 'DEPARTURE',
        planId: plan1.id,
      });

      const result = await getPlanLocationCandidates(TEST_USER_ID);
      expect(result.favorites.length).toBe(1);
      expect(result.favorites[0].name).toBe('自宅');
      expect(result.history.length).toBe(1);
      expect(result.history[0].name).toBe('過去の出発地');
    });

    it('お気に入りは使用回数降順→ID昇順でソートされる', async () => {
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '地点A',
        latitude: 35.6895,
        longitude: 139.6917,
        usageCount: 5,
      });
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '地点B',
        latitude: 35.6812,
        longitude: 139.7671,
        usageCount: 10,
      });
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '地点C',
        latitude: 35.7,
        longitude: 139.8,
        usageCount: 5,
      });

      const result = await getPlanLocationCandidates(TEST_USER_ID);
      expect(result.favorites[0].name).toBe('地点B'); // usageCount: 10
      // 同じusageCountの場合はID昇順（作成順）
      expect(result.favorites[1].name).toBe('地点A'); // usageCount: 5, 先に作成
      expect(result.favorites[2].name).toBe('地点C'); // usageCount: 5, 後に作成
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
        name: '出発地履歴',
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
        planId: plan1.id,
      });
      await createPlanLocation({
        userId: TEST_USER_ID,
        name: '目的地履歴',
        latitude: 35.6812,
        longitude: 139.7671,
        locationType: 'DESTINATION',
        planId: plan1.id,
      });

      const result = await getPlanLocationCandidates(TEST_USER_ID, {
        locationType: 'DEPARTURE',
      });
      expect(result.history.length).toBe(1);
      expect(result.history[0].locationType).toBe('DEPARTURE');
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
      // 5件のPlanLocationを作成
      for (let i = 0; i < 5; i++) {
        await createSpotWithMeta(spotId(i.toString()), { name: `スポット${i}` });
        const trip1 = await createTrip({
          title: '古い旅行',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          userId: TEST_USER_ID,
        });
        const plan = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
        await createPlanSpot({
          planId: plan.id,
          spotId: spotId(i.toString()),
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        });
        await createPlanLocation({
          userId: TEST_USER_ID,
          name: `履歴${i}`,
          latitude: 35.6895 + i * 0.01,
          longitude: 139.6917 + i * 0.01,
          locationType: 'DEPARTURE',
          planId: plan.id,
        });
      }

      const result = await getPlanLocationCandidates(TEST_USER_ID, { limit: 3 });
      expect(result.favorites.length).toBe(3);
      expect(result.history.length).toBe(3);
    });

    it('他のユーザーのデータは取得されない', async () => {
      await createUserLocation({
        userId: OTHER_USER_ID,
        name: '他人のお気に入り',
        latitude: 35.0,
        longitude: 139.0,
      });

      await createSpotWithMeta(spotId('1'), { name: `スポット1` });
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: OTHER_USER_ID,
      });
      const plan = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
      await createPlanLocation({
        userId: OTHER_USER_ID,
        name: '他人の履歴',
        latitude: 35.0,
        longitude: 139.0,
        locationType: 'DEPARTURE',
        planId: plan.id,
      });

      const result = await getPlanLocationCandidates(TEST_USER_ID);
      expect(result.favorites.length).toBe(0);
      expect(result.history.length).toBe(0);
    });
  });

  // ========================================
  // createOrUpdatePlanLocation - 作成または更新
  // ========================================
  describe('createOrUpdatePlanLocation', () => {
    it('新規地点の場合は作成される', async () => {
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: TEST_USER_ID,
      });
      const plan1 = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
      const data = {
        name: '新しい出発地',
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE' as const,
        planId: plan1.id,
      };

      const result = await createOrUpdatePlanLocation(TEST_USER_ID, data);
      expect(result.name).toBe('新しい出発地');

      const count = await countPlanLocations(TEST_USER_ID);
      expect(count).toBe(1);
    });

    it('nameが省略された場合はデフォルト名が設定される', async () => {
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: TEST_USER_ID,
      });
      const plan1 = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
      const data = {
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE' as const,
        planId: plan1.id,
      };

      const result = await createOrUpdatePlanLocation(TEST_USER_ID, data);
      // デフォルト名は「YYYY-MM-DD_出発地」の形式
      expect(result.name).toMatch(/^\d{4}-\d{2}-\d{2}_出発地$/);
    });

    it('DESTINATIONの場合のデフォルト名は「YYYY-MM-DD_目的地」', async () => {
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: TEST_USER_ID,
      });
      const plan1 = await createPlan({ tripId: trip1.id, date: '2024-01-01' });

      const data = {
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DESTINATION' as const,
        planId: plan1.id,
      };
      const result = await createOrUpdatePlanLocation(TEST_USER_ID, data);
      expect(result.name).toMatch(/^\d{4}-\d{2}-\d{2}_目的地$/);
    });

    it('planIdが指定された場合は保存される', async () => {
      // Trip/Planを作成
      const trip = await createTrip({
        userId: TEST_USER_ID,
        title: 'テスト旅行',
        startDate: '2025-01-15',
        endDate: '2025-01-16',
      });
      const plan = await createPlan({
        tripId: trip.id,
        date: '2025-01-15',
      });

      const data = {
        name: '出発地',
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE' as const,
        planId: plan.id,
      };

      const result = await createOrUpdatePlanLocation(TEST_USER_ID, data);
      expect(result.planId).toBe(plan.id);
    });
  });

  // ========================================
  // deletePlanLocation - 削除
  // ========================================
  describe('deletePlanLocation', () => {
    it('自分の履歴を削除できる', async () => {
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: TEST_USER_ID,
      });
      const plan1 = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
      const created = await createPlanLocation({
        userId: TEST_USER_ID,
        name: '削除対象',
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
        planId: plan1.id,
      });

      const result = await deletePlanLocation(TEST_USER_ID, created.id);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);

      const found = await findPlanLocationById(created.id);
      expect(found).toBeNull();
    });

    it('存在しないIDを削除しようとするとnullを返す', async () => {
      const result = await deletePlanLocation(TEST_USER_ID, 99999);
      expect(result).toBeNull();
    });

    it('他のユーザーの履歴は削除できない', async () => {
      const trip1 = await createTrip({
        title: '古い旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: OTHER_USER_ID,
      });
      const plan1 = await createPlan({ tripId: trip1.id, date: '2024-01-01' });
      const created = await createPlanLocation({
        userId: OTHER_USER_ID,
        name: '他人の地点',
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
        planId: plan1.id,
      });

      const result = await deletePlanLocation(TEST_USER_ID, created.id);
      expect(result).toBeNull();

      // 削除されていないことを確認
      const found = await findPlanLocationById(created.id);
      expect(found).not.toBeNull();
    });
  });
});
