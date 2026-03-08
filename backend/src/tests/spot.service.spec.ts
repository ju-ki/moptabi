import { beforeAll, beforeEach, afterAll, describe, expect, it, setSystemTime } from 'bun:test';
import { testClient } from 'hono/testing';

import app from '..';
import {
  clearAllTestData as clearTestData,
  clearUserTestData as clearTestDataForUser,
  connectDb as connectPrisma,
  createTestUser,
  disconnectDb as disconnectPrisma,
  createSpotWithMeta,
  createWishlistEntry,
  createTrip,
  createPlan,
  createPlanSpot,
  db,
  transport,
} from './db-helper';
import { getUnvisitedWishlistSpots, getVisitedSpots } from '../services/spot';

// testClientのインスタンスを取得（型アサーション）
const client = testClient(app) as any;

// 認証用のモックユーザーID
const TEST_USER_ID = 'test_user_spot_service';

// テストファイル固有のSpot IDプレフィックス（並列実行時の衝突を防ぐ）
const SPOT_PREFIX = 'spot_svc_';

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
  await connectPrisma();
  await clearTestDataForUser(TEST_USER_ID, SPOT_PREFIX);
  await createTestUser(TEST_USER_ID, 'ADMIN');
});

afterAll(async () => {
  await clearTestDataForUser(TEST_USER_ID, SPOT_PREFIX);
  await disconnectPrisma();
});

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
});

/**
 * trip.serviceを介して旅行計画を作成するヘルパー関数
 * @param params 旅行計画のパラメータ
 * @returns 作成した旅行計画
 */
async function createTripViaTripService(params: {
  title: string;
  startDate: string;
  endDate: string;
  spots: Array<{
    spotId: string;
    name: string;
    lat?: number;
    lng?: number;
    stayStart: string;
    stayEnd: string;
    order: number;
    isDeparture?: boolean;
    isDestination?: boolean;
  }>;
}) {
  const { title, startDate, endDate, spots } = params;

  // spotデータをAPIフォーマットに変換
  const planSpots = spots.map((spot, index) => {
    const fromType = spot.isDeparture ? 'DEPARTURE' : 'SPOT';
    const toType = spot.isDestination ? 'DESTINATION' : 'SPOT';

    return {
      id: spot.spotId,
      location: {
        name: spot.name,
        lat: spot.lat ?? 35.0 + index * 0.1,
        lng: spot.lng ?? 139.0 + index * 0.1,
      },
      spotId: spot.spotId,
      regularOpeningHours: [],
      transports: {
        transportMethod: 1,
        travelTime: '15分',
        cost: 300,
        fromType,
        toType,
      },
      memo: '',
      stayStart: spot.stayStart,
      stayEnd: spot.stayEnd,
      order: spot.order,
    };
  });

  const response = await client.api.trips.create.$post(
    {
      json: {
        title,
        imageUrl: 'https://example.com/image.jpg',
        startDate,
        endDate,
        tripInfo: [
          {
            date: startDate,
            genreId: 1,
            transportationMethod: 1,
          },
        ],
        plans: [
          {
            date: startDate,
            spots: planSpots,
            departure: {
              name: '出発地',
              latitude: 35.6895,
              longitude: 139.6917,
              address: '東京都千代田区千代田1-1',
              label: '東京駅',
              isDefault: true,
              locationType: 'DEPARTURE',
              usageCount: 0,
              userLocationId: null,
              planLocationId: null,
              transports: {
                transportMethod: 1,
                travelTime: '15分',
                cost: 300,
                fromType: 'DEPARTURE',
                toType: 'SPOT',
              },
            },
            destination: {
              name: '目的地',
              latitude: 35.6895,
              longitude: 139.6917,
              address: '東京都千代田区千代田1-1',
              label: '東京駅',
              isDefault: true,
              locationType: 'DESTINATION',
              usageCount: 0,
              userLocationId: null,
              planLocationId: null,
              transports: {
                transportMethod: 1,
                travelTime: '15分',
                cost: 300,
                fromType: 'SPOT',
                toType: 'DESTINATION',
              },
            },
          },
        ],
      },
    },
    { headers: getAuthHeaders() },
  );

  if (response.status !== 201) {
    throw new Error(`Failed to create trip: ${response.status}`);
  }

  return response.json();
}

// 再利用するいきたいリストのスポットデータのモック
const createWishlistItem = (
  id: number,
  name: string,
  rating: number,
  priority: number,
  visited: number,
  visitedAt: Date | null = null,
  memo: string | null = null,
) => ({
  id,
  spotId: `spot${id}`,
  memo,
  priority,
  visited,
  visitedAt: visitedAt,
  spot: {
    id: `spot${id}`,
    meta: {
      spotId: `spot${id}`,
      name,
      latitude: 35.6895,
      longitude: 139.6917,
      rating,
      categories: ['文化'],
      image: 'https://example.com/image.jpg',
      prefecture: '東京都',
      address: '東京都千代田区',
    },
  },
});

// 再利用する過去に計画策定した際に登録したスポットデータ

describe('🧾 スポットサービス', () => {
  const client = testClient(app) as any;

  // ---- GET: 未訪問の行きたいリストに登録しているスポットを取得する ----
  describe('GET /wishlist', () => {
    it('未訪問のデータがない場合は空の配列を渡す', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      const results = await getUnvisitedWishlistSpots(TEST_USER_ID);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('未訪問と訪問済みが混在している場合は未訪問のデータのみを返す', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 未訪問スポット
      await createSpotWithMeta(spotId('1'), {
        name: 'スポットA',
        latitude: 35.0,
        longitude: 139.0,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: spotId('1'), userId: TEST_USER_ID, priority: 2, visited: 0 });

      // 訪問済みスポット
      await createSpotWithMeta(spotId('2'), {
        name: 'スポットB',
        latitude: 35.1,
        longitude: 139.1,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({
        spotId: spotId('2'),
        userId: TEST_USER_ID,
        priority: 1,
        visited: 1,
        visitedAt: new Date(),
      });

      const results = await getUnvisitedWishlistSpots(TEST_USER_ID);

      expect(results.length).toBe(1);
      expect(results[0].spot.meta?.name).toBe('スポットA');
      expect(results[0].visited).toBe(0);
    });

    it('未訪問のいきたいリストが複数件存在する場合は優先度が一番高い順に並んでいること', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 優先度2のスポット
      await createSpotWithMeta(spotId('3'), {
        name: 'スポットC',
        latitude: 35.2,
        longitude: 139.2,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: spotId('3'), userId: TEST_USER_ID, priority: 2, visited: 0 });

      // 優先度1のスポット
      await createSpotWithMeta(spotId('4'), {
        name: 'スポットD',
        latitude: 35.3,
        longitude: 139.3,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: spotId('4'), userId: TEST_USER_ID, priority: 1, visited: 0 });

      // 優先度3のスポット
      await createSpotWithMeta(spotId('5'), {
        name: 'スポットE',
        latitude: 35.4,
        longitude: 139.4,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: spotId('5'), userId: TEST_USER_ID, priority: 3, visited: 0 });

      const results = await getUnvisitedWishlistSpots(TEST_USER_ID);

      expect(results.length).toBe(3);
      // 優先度が高い順: 3 > 2 > 1
      expect(results[0].spot.meta?.name).toBe('スポットE');
      expect(results[1].spot.meta?.name).toBe('スポットC');
      expect(results[2].spot.meta?.name).toBe('スポットD');
    });
  });

  // ---- GET: 訪問済みの行きたいリストに登録しているスポットと取得する ----
  describe('GET /visited', () => {
    it('訪問済みのデータがない場合は空の配列を渡す', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      const results = await getVisitedSpots(TEST_USER_ID);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('過去に登録したスポットデータがない場合は空の配列を渡す', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 訪問済みのwishlistのみ作成
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
      await createWishlistEntry({
        spotId: spotId('1'),
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-01-01'),
      });

      const results = await getVisitedSpots(TEST_USER_ID);

      expect(results.length).toBe(1);
      expect(results[0].spot.meta?.name).toBe('スポットA');
    });

    it('訪問済みのいきたいリストが複数件存在する場合は訪問日時が新しい順に並んでいること', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 訪問日時が古いスポット
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
      await createWishlistEntry({
        spotId: spotId('1'),
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-01-01'),
      });

      // 訪問日時が新しいスポット
      await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
      await createWishlistEntry({
        spotId: spotId('2'),
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-03-01'),
      });

      // 訪問日時が中間のスポット
      await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
      await createWishlistEntry({
        spotId: spotId('3'),
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-02-01'),
      });

      const results = await getVisitedSpots(TEST_USER_ID);

      expect(results.length).toBe(3);
      // 新しい順: スポットB(3月) > スポットC(2月) > スポットA(1月)
      expect(results[0].spot.meta?.name).toBe('スポットB');
      expect(results[1].spot.meta?.name).toBe('スポットC');
      expect(results[2].spot.meta?.name).toBe('スポットA');
    });

    it('過去に登録したスポットデータが複数件存在する場合はプランの計画日時が新しい順に並んでいること', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 古い計画
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

      // 新しい計画
      await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
      const trip2 = await createTrip({
        title: '新しい旅行',
        startDate: '2024-03-01',
        endDate: '2024-03-02',
        userId: TEST_USER_ID,
      });
      const plan2 = await createPlan({ tripId: trip2.id, date: '2024-03-01' });
      await createPlanSpot({
        planId: plan2.id,
        spotId: spotId('2'),
        stayStart: '10:00',
        stayEnd: '11:00',
        order: 1,
      });

      const results = await getVisitedSpots(TEST_USER_ID);

      expect(results.length).toBe(2);
      // 新しい順: スポットB(3月) > スポットA(1月)
      expect(results[0].spot.meta?.name).toBe('スポットB');
      expect(results[1].spot.meta?.name).toBe('スポットA');
    });

    it('訪問済みと過去に登録したスポットが混在している場合は訪問済み→過去に登録したスポットの順に並んでいること', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 訪問済みスポット
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
      await createWishlistEntry({
        spotId: spotId('1'),
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-02-01'),
      });

      // 過去の計画スポット
      await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
      const trip = await createTrip({
        title: '旅行',
        startDate: '2024-03-01',
        endDate: '2024-03-02',
        userId: TEST_USER_ID,
      });
      const plan = await createPlan({ tripId: trip.id, date: '2024-03-01' });
      await createPlanSpot({
        planId: plan.id,
        spotId: spotId('2'),
        stayStart: '10:00',
        stayEnd: '11:00',
        order: 1,
      });

      const results = await getVisitedSpots(TEST_USER_ID);

      expect(results.length).toBe(2);
      // 訪問済み→計画の順: スポットA → スポットB
      expect(results[0].spot.meta?.name).toBe('スポットA');
      expect(results[1].spot.meta?.name).toBe('スポットB');
    });

    it('訪問済みと計画策定に登録したスポットが重複している場合は片方のみを取得する', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 同じスポットを訪問済みと計画の両方に登録
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });

      // 訪問済み
      await createWishlistEntry({
        spotId: spotId('1'),
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-02-01'),
      });

      // 過去の計画
      const trip = await createTrip({
        title: '旅行',
        startDate: '2024-03-01',
        endDate: '2024-03-02',
        userId: TEST_USER_ID,
      });
      const plan = await createPlan({ tripId: trip.id, date: '2024-03-01' });
      await createPlanSpot({
        planId: plan.id,
        spotId: spotId('1'),
        stayStart: '10:00',
        stayEnd: '11:00',
        order: 1,
      });

      const results = await getVisitedSpots(TEST_USER_ID);

      expect(results.length).toBe(1);
      expect(results[0].spot.meta?.name).toBe('スポットA');
    });

    it('過去の計画に登録したスポットが重複している場合は片方のみを取得する', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 同じスポットを複数の計画に登録
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });

      // 1つ目の計画
      const trip1 = await createTrip({
        title: '旅行1',
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

      // 2つ目の計画（同じスポット）
      const trip2 = await createTrip({
        title: '旅行2',
        startDate: '2024-02-01',
        endDate: '2024-02-02',
        userId: TEST_USER_ID,
      });
      const plan2 = await createPlan({ tripId: trip2.id, date: '2024-02-01' });
      await createPlanSpot({
        planId: plan2.id,
        spotId: spotId('1'),
        stayStart: '14:00',
        stayEnd: '15:00',
        order: 1,
      });

      const results = await getVisitedSpots(TEST_USER_ID);

      // 重複が除去されて1件のみ
      expect(results.length).toBe(1);
      expect(results[0].spot.meta?.name).toBe('スポットA');
    });

    it('過去に計画したスポットに出発地と目的地として登録したスポットが含まれている場合は除外する', async () => {
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      // 出発地スポット
      await createSpotWithMeta('departure1', { name: '出発地スポット' });
      // 目的地スポット
      await createSpotWithMeta('destination1', { name: '目的地スポット' });
      // 通常のスポット
      await createSpotWithMeta(spotId('1'), { name: 'スポットA' });

      const trip = await createTrip({
        title: '旅行',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        userId: TEST_USER_ID,
      });
      const plan = await createPlan({
        tripId: trip.id,
        date: '2024-01-01',
      });

      // 出発地用のPlanSpot
      const departurePlanSpot = await createPlanSpot({
        planId: plan.id,
        spotId: 'departure1',
        stayStart: '08:00',
        stayEnd: '08:30',
        order: 0,
      });

      // 目的地用のPlanSpot
      const destinationPlanSpot = await createPlanSpot({
        planId: plan.id,
        spotId: 'destination1',
        stayStart: '18:00',
        stayEnd: '18:30',
        order: 2,
      });

      // 通常のスポット用のPlanSpot
      const normalPlanSpot = await createPlanSpot({
        planId: plan.id,
        spotId: spotId('1'),
        stayStart: '10:00',
        stayEnd: '11:00',
        order: 1,
      });

      // Transportで出発地・目的地を設定
      // 出発地 → 通常スポット
      await db.insert(transport).values({
        planId: plan.id,
        fromType: 'DEPARTURE',
        toType: 'SPOT',
        fromSpotId: departurePlanSpot.id,
        toSpotId: normalPlanSpot.id,
        transportMethod: 1,
      });

      // 通常スポット → 目的地
      await db.insert(transport).values({
        planId: plan.id,
        fromType: 'SPOT',
        toType: 'DESTINATION',
        fromSpotId: normalPlanSpot.id,
        toSpotId: destinationPlanSpot.id,
        transportMethod: 1,
      });

      const results = await getVisitedSpots(TEST_USER_ID);

      // 通常のスポットのみが取得される（出発地・目的地は除外）
      expect(results.length).toBe(1);
      expect(results[0].spot.meta?.name).toBe('スポットA');
    });
  });

  // ---- フィルター・ソート機能のテスト ----
  describe('フィルター機能', () => {
    describe('GET /unvisited - 未訪問スポットのフィルター', () => {
      it('都道府県でフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 東京都のスポット
        await createSpotWithMeta(spotId('1'), {
          name: 'スポットA',
          latitude: 35.0,
          longitude: 139.0,
          prefecture: '東京都',
        });
        await createWishlistEntry({ spotId: spotId('1'), userId: TEST_USER_ID, priority: 2, visited: 0 });

        // 大阪府のスポット
        await createSpotWithMeta(spotId('2'), {
          name: 'スポットB',
          latitude: 34.7,
          longitude: 135.5,
          prefecture: '大阪府',
        });
        await createWishlistEntry({ spotId: spotId('2'), userId: TEST_USER_ID, priority: 3, visited: 0 });

        // 東京都のスポット（追加）
        await createSpotWithMeta(spotId('3'), {
          name: 'スポットC',
          latitude: 35.1,
          longitude: 139.1,
          prefecture: '東京都',
        });
        await createWishlistEntry({ spotId: spotId('3'), userId: TEST_USER_ID, priority: 1, visited: 0 });

        const results = await getUnvisitedWishlistSpots(TEST_USER_ID, {
          prefecture: '東京都',
          sortBy: 'priority',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(2);
        expect(results.every((r) => r.spot.meta?.prefecture === '東京都')).toBe(true);
      });

      it('優先度でフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 優先度3のスポット
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({ spotId: spotId('1'), userId: TEST_USER_ID, priority: 3, visited: 0 });

        // 優先度1のスポット
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({ spotId: spotId('2'), userId: TEST_USER_ID, priority: 1, visited: 0 });

        // 優先度3のスポット（追加）
        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({ spotId: spotId('3'), userId: TEST_USER_ID, priority: 3, visited: 0 });

        const results = await getUnvisitedWishlistSpots(TEST_USER_ID, {
          priority: 3,
          sortBy: 'priority',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(2);
        expect(results.every((r) => r.priority === 3)).toBe(true);
      });

      it('都道府県と優先度を組み合わせてフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 東京都、優先度3
        await createSpotWithMeta(spotId('1'), { name: 'スポットA', prefecture: '東京都' });
        await createWishlistEntry({ spotId: spotId('1'), userId: TEST_USER_ID, priority: 3, visited: 0 });

        // 東京都、優先度1
        await createSpotWithMeta(spotId('2'), { name: 'スポットB', prefecture: '東京都' });
        await createWishlistEntry({ spotId: spotId('2'), userId: TEST_USER_ID, priority: 1, visited: 0 });

        // 大阪府、優先度3
        await createSpotWithMeta(spotId('3'), { name: 'スポットC', prefecture: '大阪府' });
        await createWishlistEntry({ spotId: spotId('3'), userId: TEST_USER_ID, priority: 3, visited: 0 });

        const results = await getUnvisitedWishlistSpots(TEST_USER_ID, {
          prefecture: '東京都',
          priority: 3,
          sortBy: 'priority',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(1);
        expect(results[0].spot.meta?.name).toBe('スポットA');
        expect(results[0].spot.meta?.prefecture).toBe('東京都');
        expect(results[0].priority).toBe(3);
      });
    });

    describe('GET /visited - 訪問済みスポットのフィルター', () => {
      it('都道府県でフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 東京都のスポット
        await createSpotWithMeta(spotId('1'), { name: 'スポットA', prefecture: '東京都' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        // 大阪府のスポット
        await createSpotWithMeta(spotId('2'), { name: 'スポットB', prefecture: '大阪府' });
        await createWishlistEntry({
          spotId: spotId('2'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-02-01'),
        });

        // 東京都のスポット（追加）
        await createSpotWithMeta(spotId('3'), { name: 'スポットC', prefecture: '東京都' });
        await createWishlistEntry({
          spotId: spotId('3'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-03-01'),
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          prefecture: '東京都',
          sortBy: 'visitedAt',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(2);
        expect(results.every((r) => r.spot.meta?.prefecture === '東京都')).toBe(true);
      });
      it('訪問済みスポットの訪問日時に対して期間指定でフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 2024年1月のスポット（範囲外）
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        // 2024年6月のスポット（範囲内）
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({
          spotId: spotId('2'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-06-01'),
        });

        // 2024年8月のスポット（範囲内）
        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({
          spotId: spotId('3'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-08-01'),
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          dateFrom: '2024-05-01',
          dateTo: '2024-09-01',
          sortBy: 'visitedAt',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(2);
        expect(results[0].spot.meta?.name).toBe('スポットC');
        expect(results[1].spot.meta?.name).toBe('スポットB');
      });
      it('過去に計画したスポットに対して期間指定でフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 2024年1月の計画スポット（範囲外）- trip.serviceを介して作成
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createTripViaTripService({
          title: '旅行1',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          spots: [
            {
              spotId: spotId('1'),
              name: 'スポットA',
              stayStart: '10:00',
              stayEnd: '11:00',
              order: 1,
            },
          ],
        });

        // 2024年6月の計画スポット（範囲内）- trip.serviceを介して作成
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createTripViaTripService({
          title: '旅行2',
          startDate: '2024-06-01',
          endDate: '2024-06-02',
          spots: [
            {
              spotId: spotId('2'),
              name: 'スポットB',
              stayStart: '10:00',
              stayEnd: '11:00',
              order: 1,
            },
          ],
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          dateFrom: '2024-05-01',
          dateTo: '2024-09-01',
          sortBy: 'visitedAt',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(1);
        expect(results[0].spot.meta?.name).toBe('スポットB');
      });
      it('訪問済みスポットと過去に計画したスポットに対して期間指定でフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 訪問済みスポット（2024年1月 - 範囲外）
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        // 訪問済みスポット（2024年6月 - 範囲内）
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({
          spotId: spotId('2'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-06-01'),
        });

        // 計画スポット（2024年2月 - 範囲外）- trip.serviceを介して作成
        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createTripViaTripService({
          title: '旅行1',
          startDate: '2024-02-01',
          endDate: '2024-02-02',
          spots: [
            {
              spotId: spotId('3'),
              name: 'スポットC',
              stayStart: '10:00',
              stayEnd: '11:00',
              order: 1,
            },
          ],
        });

        // 計画スポット（2024年7月 - 範囲内）- trip.serviceを介して作成
        await createSpotWithMeta(spotId('4'), { name: 'スポットD' });
        await createTripViaTripService({
          title: '旅行2',
          startDate: '2024-07-01',
          endDate: '2024-07-02',
          spots: [
            {
              spotId: spotId('4'),
              name: 'スポットD',
              stayStart: '10:00',
              stayEnd: '11:00',
              order: 1,
            },
          ],
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          dateFrom: '2024-05-01',
          dateTo: '2024-09-01',
          sortBy: 'visitedAt',
          sortOrder: 'desc',
        });

        // 範囲内の訪問済み(1件) + 範囲内の計画(1件) = 2件
        expect(results.length).toBe(2);
        // 訪問済みが先
        expect(results[0].spot.meta?.name).toBe('スポットB');
        expect(results[1].spot.meta?.name).toBe('スポットD');
      });

      it('都道府県と期間指定を組み合わせてフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 東京都、2024年6月（両方の条件に合致）
        await createSpotWithMeta(spotId('1'), { name: 'スポットA', prefecture: '東京都' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-06-01'),
        });

        // 東京都、2024年1月（期間外）
        await createSpotWithMeta(spotId('2'), { name: 'スポットB', prefecture: '東京都' });
        await createWishlistEntry({
          spotId: spotId('2'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        // 大阪府、2024年6月（都道府県が異なる）
        await createSpotWithMeta(spotId('3'), { name: 'スポットC', prefecture: '大阪府' });
        await createWishlistEntry({
          spotId: spotId('3'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-06-15'),
        });

        // 東京都、2024年7月（両方の条件に合致）
        await createSpotWithMeta(spotId('4'), { name: 'スポットD', prefecture: '東京都' });
        await createWishlistEntry({
          spotId: spotId('4'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-07-01'),
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          prefecture: '東京都',
          dateFrom: '2024-05-01',
          dateTo: '2024-09-01',
          sortBy: 'visitedAt',
          sortOrder: 'desc',
        });

        // 東京都 かつ 期間内 = 2件
        expect(results.length).toBe(2);
        expect(results[0].spot.meta?.name).toBe('スポットD');
        expect(results[1].spot.meta?.name).toBe('スポットA');
        expect(results.every((r) => r.spot.meta?.prefecture === '東京都')).toBe(true);
      });

      it('計画したスポットと訪問済みのスポットで、登録されているスポットの回数でフィルタリングできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // スポットA: 3回計画に登録
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        for (let i = 0; i < 3; i++) {
          const trip = await createTrip({
            title: `旅行A${i + 1}`,
            startDate: `2024-0${i + 1}-01`,
            endDate: `2024-0${i + 1}-02`,
            userId: TEST_USER_ID,
          });
          const plan = await createPlan({ tripId: trip.id, date: `2024-0${i + 1}-01` });
          await createPlanSpot({
            planId: plan.id,
            spotId: spotId('1'),
            stayStart: '10:00',
            stayEnd: '11:00',
            order: 1,
          });
        }

        // スポットB: 1回計画に登録
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        const tripB = await createTrip({
          title: '旅行B',
          startDate: '2024-04-01',
          endDate: '2024-04-02',
          userId: TEST_USER_ID,
        });
        const planB = await createPlan({ tripId: tripB.id, date: '2024-04-01' });
        await createPlanSpot({
          planId: planB.id,
          spotId: spotId('2'),
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        });

        // minVisitCount=2で検索（2回以上登録されたスポットのみ）
        const results = await getVisitedSpots(TEST_USER_ID, {
          minVisitCount: 2,
          sortBy: 'visitedAt',
          sortOrder: 'desc',
        });

        // スポットAのみ（3回登録）
        expect(results.length).toBe(1);
        expect(results[0].spot.meta?.name).toBe('スポットA');
      });
    });
  });

  describe('ソート機能', () => {
    describe('GET /unvisited - 未訪問スポットのソート', () => {
      it('追加日時の昇順/降順でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');
        setSystemTime();

        // 1番目に追加（古い）
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({ spotId: spotId('1'), userId: TEST_USER_ID, priority: 1, visited: 0 });

        // 少し待ってから2番目を追加
        await new Promise((resolve) => setTimeout(resolve, 10));

        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({ spotId: spotId('2'), userId: TEST_USER_ID, priority: 2, visited: 0 });

        // 少し待ってから3番目を追加
        await new Promise((resolve) => setTimeout(resolve, 10));

        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({ spotId: spotId('3'), userId: TEST_USER_ID, priority: 3, visited: 0 });

        const results = await getUnvisitedWishlistSpots(TEST_USER_ID, {
          sortBy: 'createdAt',
          sortOrder: 'asc',
        });

        expect(results.length).toBe(3);
        // 古い順: A → B → C
        expect(results[0].spot.meta?.name).toBe('スポットA');
        expect(results[1].spot.meta?.name).toBe('スポットB');
        expect(results[2].spot.meta?.name).toBe('スポットC');

        const results2 = await getUnvisitedWishlistSpots(TEST_USER_ID, {
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        expect(results2.length).toBe(3);
        // 新しい順: C → B → A
        expect(results2[0].spot.meta?.name).toBe('スポットC');
        expect(results2[1].spot.meta?.name).toBe('スポットB');
        expect(results2[2].spot.meta?.name).toBe('スポットA');
      });

      it('優先度の昇順でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({ spotId: spotId('1'), userId: TEST_USER_ID, priority: 3, visited: 0 });

        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({ spotId: spotId('2'), userId: TEST_USER_ID, priority: 1, visited: 0 });

        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({ spotId: spotId('3'), userId: TEST_USER_ID, priority: 2, visited: 0 });

        const results = await getUnvisitedWishlistSpots(TEST_USER_ID, {
          sortBy: 'priority',
          sortOrder: 'asc',
        });

        expect(results.length).toBe(3);
        // 優先度が低い順: 1 → 2 → 3
        expect(results[0].spot.meta?.name).toBe('スポットB');
        expect(results[1].spot.meta?.name).toBe('スポットC');
        expect(results[2].spot.meta?.name).toBe('スポットA');
      });
    });

    describe('GET /visited - 訪問済みスポットのソート', () => {
      it('訪問日時の昇順でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-03-01'),
        });

        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({
          spotId: spotId('2'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({
          spotId: spotId('3'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-02-01'),
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          sortBy: 'visitedAt',
          sortOrder: 'asc',
        });

        expect(results.length).toBe(3);
        // 訪問日が古い順: B(1月) → C(2月) → A(3月)
        expect(results[0].spot.meta?.name).toBe('スポットB');
        expect(results[1].spot.meta?.name).toBe('スポットC');
        expect(results[2].spot.meta?.name).toBe('スポットA');
      });

      it('追加日時でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 1番目に追加
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        // 少し待ってから2番目を追加
        await new Promise((resolve) => setTimeout(resolve, 10));

        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({
          spotId: spotId('2'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-03-01'),
        });

        // 少し待ってから3番目を追加
        await new Promise((resolve) => setTimeout(resolve, 10));

        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({
          spotId: spotId('3'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-02-01'),
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(3);
        // 追加日が新しい順: C → B → A
        expect(results[0].spot.meta?.name).toBe('スポットC');
        expect(results[1].spot.meta?.name).toBe('スポットB');
        expect(results[2].spot.meta?.name).toBe('スポットA');
      });

      it('計画日時でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 古い計画のスポット
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        const trip1 = await createTrip({
          title: '旅行1',
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

        // 新しい計画のスポット
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        const trip2 = await createTrip({
          title: '旅行2',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          userId: TEST_USER_ID,
        });
        const plan2 = await createPlan({ tripId: trip2.id, date: '2024-03-01' });
        await createPlanSpot({
          planId: plan2.id,
          spotId: spotId('2'),
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        });

        // 中間の計画のスポット
        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        const trip3 = await createTrip({
          title: '旅行3',
          startDate: '2024-02-01',
          endDate: '2024-02-02',
          userId: TEST_USER_ID,
        });
        const plan3 = await createPlan({ tripId: trip3.id, date: '2024-02-01' });
        await createPlanSpot({
          planId: plan3.id,
          spotId: spotId('3'),
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        });

        const results = await getVisitedSpots(TEST_USER_ID, {
          sortBy: 'planDate',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(3);
        // 計画日が新しい順: B(3月) → C(2月) → A(1月)
        expect(results[0].spot.meta?.name).toBe('スポットB');
        expect(results[1].spot.meta?.name).toBe('スポットC');
        expect(results[2].spot.meta?.name).toBe('スポットA');
      });

      it('訪問日時でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 訪問済みスポット3件
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-03-15'),
        });

        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        await createWishlistEntry({
          spotId: spotId('2'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-10'),
        });

        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({
          spotId: spotId('3'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-02-20'),
        });

        // 訪問日が古い順（昇順）
        const resultsAsc = await getVisitedSpots(TEST_USER_ID, {
          sortBy: 'visitedAt',
          sortOrder: 'asc',
        });

        expect(resultsAsc.length).toBe(3);
        expect(resultsAsc[0].spot.meta?.name).toBe('スポットB'); // 1月
        expect(resultsAsc[1].spot.meta?.name).toBe('スポットC'); // 2月
        expect(resultsAsc[2].spot.meta?.name).toBe('スポットA'); // 3月
      });

      it('計画日時と訪問日時でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // 訪問済みスポット（2024年2月訪問）
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        await createWishlistEntry({
          spotId: spotId('1'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-02-01'),
        });

        // 計画スポット（2024年3月計画）
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        const trip = await createTrip({
          title: '旅行',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          userId: TEST_USER_ID,
        });
        const plan = await createPlan({ tripId: trip.id, date: '2024-03-01' });
        await createPlanSpot({
          planId: plan.id,
          spotId: spotId('2'),
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        });

        // 訪問済みスポット（2024年1月訪問）
        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        await createWishlistEntry({
          spotId: spotId('3'),
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        // 訪問日/計画日が新しい順（訪問済みが先に来る従来の動作を維持）
        const results = await getVisitedSpots(TEST_USER_ID, {
          sortBy: 'visitedAt',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(3);
        // 訪問済みが先、その後計画スポット
        // 訪問済み: A(2月) → C(1月)、計画: B(3月)
        expect(results[0].spot.meta?.name).toBe('スポットA');
        expect(results[1].spot.meta?.name).toBe('スポットC');
        expect(results[2].spot.meta?.name).toBe('スポットB');
      });

      it('過去に計画した回数が多いスポット順でソートできること', async () => {
        await clearTestData();
        await createTestUser(TEST_USER_ID, 'ADMIN');

        // スポットA: 2回計画に登録
        await createSpotWithMeta(spotId('1'), { name: 'スポットA' });
        for (let i = 0; i < 2; i++) {
          const tripA = await createTrip({
            title: `旅行A${i + 1}`,
            startDate: `2024-0${i + 1}-01`,
            endDate: `2024-0${i + 1}-02`,
            userId: TEST_USER_ID,
          });
          const planA = await createPlan({ tripId: tripA.id, date: `2024-0${i + 1}-01` });
          await createPlanSpot({
            planId: planA.id,
            spotId: spotId('1'),
            stayStart: '10:00',
            stayEnd: '11:00',
            order: 1,
          });
        }

        // スポットB: 1回計画に登録
        await createSpotWithMeta(spotId('2'), { name: 'スポットB' });
        const tripB = await createTrip({
          title: '旅行B',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          userId: TEST_USER_ID,
        });
        const planB = await createPlan({ tripId: tripB.id, date: '2024-03-01' });
        await createPlanSpot({
          planId: planB.id,
          spotId: spotId('2'),
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        });

        // スポットC: 3回計画に登録
        await createSpotWithMeta(spotId('3'), { name: 'スポットC' });
        for (let i = 0; i < 3; i++) {
          const tripC = await createTrip({
            title: `旅行C${i + 1}`,
            startDate: `2024-0${i + 4}-01`,
            endDate: `2024-0${i + 4}-02`,
            userId: TEST_USER_ID,
          });
          const planC = await createPlan({ tripId: tripC.id, date: `2024-0${i + 4}-01` });
          await createPlanSpot({
            planId: planC.id,
            spotId: spotId('3'),
            stayStart: '10:00',
            stayEnd: '11:00',
            order: 1,
          });
        }

        const results = await getVisitedSpots(TEST_USER_ID, {
          sortBy: 'visitCount',
          sortOrder: 'desc',
        });

        expect(results.length).toBe(3);
        // 回数が多い順: C(3回) → A(2回) → B(1回)
        expect(results[0].spot.meta?.name).toBe('スポットC');
        expect(results[1].spot.meta?.name).toBe('スポットA');
        expect(results[2].spot.meta?.name).toBe('スポットB');
      });
    });
  });
});
