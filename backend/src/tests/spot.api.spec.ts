import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'bun:test';
import { testClient } from 'hono/testing';
import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';

import app from '..';
import prismaUtil, {
  clearTestData,
  connectPrisma,
  createTestUser,
  disconnectPrisma,
  createSpotWithMeta,
  createWishlistEntry,
} from './prisma';

// 認証用のモックユーザーID
const TEST_USER_ID = 'test_user_id';

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(),
}));

beforeAll(async () => {
  await connectPrisma();
  await clearTestData();
  await createTestUser(TEST_USER_ID);
});

afterAll(async () => {
  await clearTestData();
  await disconnectPrisma();
});

beforeEach(async () => {
  vi.clearAllMocks();
  (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: TEST_USER_ID });
  await clearTestData();
  await createTestUser(TEST_USER_ID);
});

describe('🗺️ スポットAPI統合テスト', () => {
  const client = testClient(app) as any;

  // ---- GET: 未訪問スポット取得 ----
  describe('GET /api/spots/unvisited', () => {
    it('未訪問のデータがない場合は空の配列を返す', async () => {
      const res = await client.api.spots.unvisited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('未訪問のスポットのみを返す', async () => {
      // 未訪問スポット
      await createSpotWithMeta('spot1', {
        name: 'スポットA',
        latitude: 35.0,
        longitude: 139.0,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: 'spot1', userId: TEST_USER_ID, priority: 2, visited: 0 });

      // 訪問済みスポット（こちらは含まれない）
      await createSpotWithMeta('spot2', {
        name: 'スポットB',
        latitude: 35.1,
        longitude: 139.1,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({
        spotId: 'spot2',
        userId: TEST_USER_ID,
        priority: 1,
        visited: 1,
        visitedAt: new Date(),
      });

      const res = await client.api.spots.unvisited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].spot.meta.name).toBe('スポットA');
      expect(data[0].visited).toBe(0);
    });

    it('優先度が高い順に並んでいる', async () => {
      // 優先度2のスポット
      await createSpotWithMeta('spot3', {
        name: 'スポットC',
        latitude: 35.2,
        longitude: 139.2,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: 'spot3', userId: TEST_USER_ID, priority: 2, visited: 0 });

      // 優先度1のスポット
      await createSpotWithMeta('spot4', {
        name: 'スポットD',
        latitude: 35.3,
        longitude: 139.3,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: 'spot4', userId: TEST_USER_ID, priority: 1, visited: 0 });

      // 優先度3のスポット
      await createSpotWithMeta('spot5', {
        name: 'スポットE',
        latitude: 35.4,
        longitude: 139.4,
        categories: ['文化'],
        prefecture: '東京都',
      });
      await createWishlistEntry({ spotId: 'spot5', userId: TEST_USER_ID, priority: 3, visited: 0 });

      const res = await client.api.spots.unvisited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(3);
      // 優先度が高い順: 3 > 2 > 1
      expect(data[0].spot.meta.name).toBe('スポットE');
      expect(data[1].spot.meta.name).toBe('スポットC');
      expect(data[2].spot.meta.name).toBe('スポットD');
    });

    it('認証されていない場合は401を返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });

      const res = await client.api.spots.unvisited.$get();

      expect(res.status).toBe(401);
    });
  });

  // ---- GET: 訪問済み・過去スポット取得 ----
  describe('GET /api/spots/visited', () => {
    it('訪問済みのデータがない場合は空の配列を返す', async () => {
      const res = await client.api.spots.visited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('訪問済みスポットを返す', async () => {
      // 訪問済みのwishlistのみ作成
      await createSpotWithMeta('spot1', { name: 'スポットA' });
      await createWishlistEntry({
        spotId: 'spot1',
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-01-01'),
      });

      const res = await client.api.spots.visited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].spot.meta.name).toBe('スポットA');
    });

    it('訪問済みスポットは訪問日時が新しい順に並んでいる', async () => {
      // 訪問日時が古いスポット
      await createSpotWithMeta('spot1', { name: 'スポットA' });
      await createWishlistEntry({
        spotId: 'spot1',
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-01-01'),
      });

      // 訪問日時が新しいスポット
      await createSpotWithMeta('spot2', { name: 'スポットB' });
      await createWishlistEntry({
        spotId: 'spot2',
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-03-01'),
      });

      // 訪問日時が中間のスポット
      await createSpotWithMeta('spot3', { name: 'スポットC' });
      await createWishlistEntry({
        spotId: 'spot3',
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-02-01'),
      });

      const res = await client.api.spots.visited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(3);
      // 新しい順: スポットB(3月) > スポットC(2月) > スポットA(1月)
      expect(data[0].spot.meta.name).toBe('スポットB');
      expect(data[1].spot.meta.name).toBe('スポットC');
      expect(data[2].spot.meta.name).toBe('スポットA');
    });

    it('過去の計画スポットを計画日時が新しい順に返す', async () => {
      // 古い計画
      await createSpotWithMeta('spot1', { name: 'スポットA' });
      const trip1 = await prismaUtil.prisma.trip.create({
        data: {
          title: '古い旅行',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          userId: TEST_USER_ID,
        },
      });
      const plan1 = await prismaUtil.prisma.plan.create({
        data: { tripId: trip1.id, date: '2024-01-01' },
      });
      await prismaUtil.prisma.planSpot.create({
        data: {
          planId: plan1.id,
          spotId: 'spot1',
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        },
      });

      // 新しい計画
      await createSpotWithMeta('spot2', { name: 'スポットB' });
      const trip2 = await prismaUtil.prisma.trip.create({
        data: {
          title: '新しい旅行',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          userId: TEST_USER_ID,
        },
      });
      const plan2 = await prismaUtil.prisma.plan.create({
        data: { tripId: trip2.id, date: '2024-03-01' },
      });
      await prismaUtil.prisma.planSpot.create({
        data: {
          planId: plan2.id,
          spotId: 'spot2',
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        },
      });

      const res = await client.api.spots.visited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(2);
      // 新しい順: スポットB(3月) > スポットA(1月)
      expect(data[0].spot.meta.name).toBe('スポットB');
      expect(data[1].spot.meta.name).toBe('スポットA');
    });

    it('訪問済みと計画スポットが混在する場合は訪問済み優先で返す', async () => {
      // 訪問済みスポット
      await createSpotWithMeta('spot1', { name: 'スポットA' });
      await createWishlistEntry({
        spotId: 'spot1',
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-02-01'),
      });

      // 過去の計画スポット
      await createSpotWithMeta('spot2', { name: 'スポットB' });
      const trip = await prismaUtil.prisma.trip.create({
        data: {
          title: '旅行',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          userId: TEST_USER_ID,
        },
      });
      const plan = await prismaUtil.prisma.plan.create({
        data: { tripId: trip.id, date: '2024-03-01' },
      });
      await prismaUtil.prisma.planSpot.create({
        data: {
          planId: plan.id,
          spotId: 'spot2',
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        },
      });

      const res = await client.api.spots.visited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(2);
      // 訪問済み→計画の順: スポットA → スポットB
      expect(data[0].spot.meta.name).toBe('スポットA');
      expect(data[1].spot.meta.name).toBe('スポットB');
    });

    it('重複するスポットは片方のみを返す', async () => {
      // 同じスポットを訪問済みと計画の両方に登録
      await createSpotWithMeta('spot1', { name: 'スポットA' });

      // 訪問済み
      await createWishlistEntry({
        spotId: 'spot1',
        userId: TEST_USER_ID,
        visited: 1,
        visitedAt: new Date('2024-02-01'),
      });

      // 過去の計画
      const trip = await prismaUtil.prisma.trip.create({
        data: {
          title: '旅行',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          userId: TEST_USER_ID,
        },
      });
      const plan = await prismaUtil.prisma.plan.create({
        data: { tripId: trip.id, date: '2024-03-01' },
      });
      await prismaUtil.prisma.planSpot.create({
        data: {
          planId: plan.id,
          spotId: 'spot1',
          stayStart: '10:00',
          stayEnd: '11:00',
          order: 1,
        },
      });

      const res = await client.api.spots.visited.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].spot.meta.name).toBe('スポットA');
    });

    it('認証されていない場合は401を返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });

      const res = await client.api.spots.visited.$get();

      expect(res.status).toBe(401);
    });

    describe('GET /api/spots/visited - 日付フィルターのAPIテスト', () => {
      it('dateFromとdateToで計画スポットをフィルタリングできること', async () => {
        // 2024年1月の計画スポット（範囲外）
        await createSpotWithMeta('spot1', { name: 'スポットA' });
        const trip1 = await prismaUtil.prisma.trip.create({
          data: {
            title: '古い旅行',
            startDate: '2024-01-01',
            endDate: '2024-01-02',
            userId: TEST_USER_ID,
          },
        });
        const plan1 = await prismaUtil.prisma.plan.create({
          data: { tripId: trip1.id, date: '2024-01-01' },
        });
        await prismaUtil.prisma.planSpot.create({
          data: {
            planId: plan1.id,
            spotId: 'spot1',
            stayStart: '10:00',
            stayEnd: '11:00',
            order: 1,
          },
        });

        // 2024年6月の計画スポット（範囲内）
        await createSpotWithMeta('spot2', { name: 'スポットB' });
        const trip2 = await prismaUtil.prisma.trip.create({
          data: {
            title: '新しい旅行',
            startDate: '2024-06-01',
            endDate: '2024-06-02',
            userId: TEST_USER_ID,
          },
        });
        const plan2 = await prismaUtil.prisma.plan.create({
          data: { tripId: trip2.id, date: '2024-06-01' },
        });
        await prismaUtil.prisma.planSpot.create({
          data: {
            planId: plan2.id,
            spotId: 'spot2',
            stayStart: '10:00',
            stayEnd: '11:00',
            order: 1,
          },
        });

        // クエリパラメータを使用してAPI呼び出し
        const res = await client.api.spots.visited.$get({
          query: {
            dateFrom: '2024-05-01',
            dateTo: '2024-09-01',
          },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        // 範囲内のスポット（スポットB）のみ返される
        expect(data.length).toBe(1);
        expect(data[0].spot.meta.name).toBe('スポットB');
      });

      it('dateFromのみ指定で計画スポットをフィルタリングできること', async () => {
        // 2024年1月の計画スポット（範囲外）
        await createSpotWithMeta('spot1', { name: 'スポットA' });
        const trip1 = await prismaUtil.prisma.trip.create({
          data: {
            title: '古い旅行',
            startDate: '2024-01-01',
            endDate: '2024-01-02',
            userId: TEST_USER_ID,
          },
        });
        const plan1 = await prismaUtil.prisma.plan.create({
          data: { tripId: trip1.id, date: '2024-01-01' },
        });
        await prismaUtil.prisma.planSpot.create({
          data: {
            planId: plan1.id,
            spotId: 'spot1',
            stayStart: '10:00',
            stayEnd: '11:00',
            order: 1,
          },
        });

        // 2024年6月の計画スポット（範囲内）
        await createSpotWithMeta('spot2', { name: 'スポットB' });
        const trip2 = await prismaUtil.prisma.trip.create({
          data: {
            title: '新しい旅行',
            startDate: '2024-06-01',
            endDate: '2024-06-02',
            userId: TEST_USER_ID,
          },
        });
        const plan2 = await prismaUtil.prisma.plan.create({
          data: { tripId: trip2.id, date: '2024-06-01' },
        });
        await prismaUtil.prisma.planSpot.create({
          data: {
            planId: plan2.id,
            spotId: 'spot2',
            stayStart: '10:00',
            stayEnd: '11:00',
            order: 1,
          },
        });

        // dateFromのみ指定
        const res = await client.api.spots.visited.$get({
          query: {
            dateFrom: '2024-05-01',
          },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        // 2024-05-01以降のスポット（スポットB）のみ返される
        expect(data.length).toBe(1);
        expect(data[0].spot.meta.name).toBe('スポットB');
      });

      it('訪問済みスポットのvisitedAtに対して期間指定でフィルタリングできること', async () => {
        // 2024年1月の訪問済みスポット（範囲外）
        await createSpotWithMeta('spot1', { name: 'スポットA' });
        await createWishlistEntry({
          spotId: 'spot1',
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-01-01'),
        });

        // 2024年6月の訪問済みスポット（範囲内）
        await createSpotWithMeta('spot2', { name: 'スポットB' });
        await createWishlistEntry({
          spotId: 'spot2',
          userId: TEST_USER_ID,
          visited: 1,
          visitedAt: new Date('2024-06-01'),
        });

        // クエリパラメータを使用してAPI呼び出し
        const res = await client.api.spots.visited.$get({
          query: {
            dateFrom: '2024-05-01',
            dateTo: '2024-09-01',
          },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        // 範囲内のスポット（スポットB）のみ返される
        expect(data.length).toBe(1);
        expect(data[0].spot.meta.name).toBe('スポットB');
      });
    });
  });
});
