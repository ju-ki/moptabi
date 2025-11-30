import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'bun:test';
import { testClient } from 'hono/testing';
import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';

import { TripSchema } from '@/models/trip';

import app from '..';
import {
  clearTestData,
  connectPrisma,
  createTestUser,
  createTransportMethodsIfNotExist,
  disconnectPrisma,
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
  await createTransportMethodsIfNotExist();
});

export const mockAuthenticatedContext = (userId: string = TEST_USER_ID): Context => {
  return {
    get: (key: string) => {
      if (key === 'auth') {
        return {
          userId,
          sessionId: 'mockSessionId',
        };
      }

      return undefined;
    },
  } as unknown as Context;
};

// モックtripデータ
const mockTripData = {
  title: 'モック旅行タイトル',
  imageUrl: 'https://example.com/mock-image.jpg',
  startDate: '2024-01-01',
  endDate: '2024-01-02',
};

// モックtripInfoデータ
const mockTripInfoData = [
  {
    date: '2024-01-01',
    genreId: 1,
    transportationMethod: [1],
    memo: 'モックの旅行情報メモ',
  },
  {
    date: '2024-01-02',
    genreId: 2,
    transportationMethod: [2],
  },
];

const mockPlanData = [
  {
    date: '2024-01-01',
    spots: [
      {
        id: 'departure_spot' + Math.random().toString(36).substring(2, 15),
        location: {
          name: '出発地',
          lat: 35.6762,
          lng: 139.6503,
        },
        spotId: 'departure_spot' + Math.random().toString(36).substring(2, 15),
        regularOpeningHours: [],
        transports: {
          transportMethodIds: [1],
          travelTime: '15分',
          cost: 300,
          fromType: 'DEPARTURE',
          toType: 'SPOT',
        },
        memo: '出発地のメモ',
        stayStart: '08:00',
        stayEnd: '08:15',
        order: 0,
      },
      {
        id: 'spot1',
        location: {
          name: 'モック観光地1',
          lat: 35.6895,
          lng: 139.6917,
        },
        spotId: 'spot1',
        image: 'https://example.com/spot1.jpg',
        url: 'https://example.com/cafe',
        prefecture: '東京都',
        address: '東京都渋谷区神南1-19-11',
        rating: 4.5,
        categories: ['museum', 'historical'],
        catchphrase: '歴史ある素晴らしい場所です',
        description: 'このスポットは多くの歴史的な価値を持っています。',
        openingHours: [
          { day: '月', hours: '9:00-17:00' },
          { day: '火', hours: '9:00-17:00' },
          { day: '水', hours: '9:00-17:00' },
          { day: '木', hours: '9:00-17:00' },
          { day: '金', hours: '9:00-17:00' },
          { day: '土', hours: '10:00-18:00' },
          { day: '日', hours: '10:00-18:00' },
        ],
        transports: {
          transportMethodIds: [1],
          travelTime: '30分',
          cost: 500,
          fromType: 'SPOT',
          toType: 'SPOT',
        },
        stayStart: '10:00',
        stayEnd: '12:00',
        memo: 'モックスポット1のメモ',
        order: 1,
      },
      {
        id: 'spot2',
        location: {
          name: 'モック観光地2',
          lat: 34.6937,
          lng: 135.5023,
        },
        spotId: 'spot2',
        image: 'https://example.com/spot2.jpg',
        url: 'https://example.com/cafe',
        prefecture: '東京都',
        address: '東京都渋谷区神南1-19-11',
        rating: 4.0,
        categories: ['park'],
        catchphrase: '自然を満喫できるスポットです',
        description: '広大な自然公園でリラックスできます。',
        regularOpeningHours: [
          { day: '月', hours: '6:00-20:00' },
          { day: '火', hours: '6:00-20:00' },
          { day: '水', hours: '6:00-20:00' },
          { day: '木', hours: '6:00-20:00' },
          { day: '金', hours: '6:00-20:00' },
          { day: '土', hours: '6:00-22:00' },
          { day: '日', hours: '6:00-22:00' },
        ],
        transports: {
          transportMethodIds: [2],
          travelTime: '45分',
          cost: 700,
          fromType: 'SPOT',
          toType: 'SPOT',
        },
        stayStart: '14:00',
        stayEnd: '16:00',
        memo: 'モックスポット2のメモ',
        order: 2,
      },
      {
        id: 'Destination',
        location: {
          name: '目的地',
          lat: 35.6762,
          lng: 139.6503,
        },
        spotId: 'destination_spot' + Math.random().toString(36).substring(2, 15),
        regularOpeningHours: [],
        transports: {
          transportMethodIds: [1],
          travelTime: '15分',
          cost: 300,
          fromType: 'SPOT',
          toType: 'DESTINATION',
        },
        stayStart: '18:00',
        stayEnd: '18:15',
        memo: '目的地のメモ',
        order: 3,
      },
    ],
  },
  {
    date: '2024-01-02',
    spots: [
      {
        id: 'departure_spot' + Math.random().toString(36).substring(2, 15),
        location: {
          name: '出発地',
          lat: 35.6762,
          lng: 139.6503,
        },
        spotId: 'departure_spot' + Math.random().toString(36).substring(2, 15),
        regularOpeningHours: [],
        transports: {
          transportMethodIds: [1],
          travelTime: '15分',
          cost: 300,
          fromType: 'DEPARTURE',
          toType: 'SPOT',
        },
        stayStart: '08:00',
        stayEnd: '08:15',
        memo: '出発地のメモ',
        order: 0,
      },
      {
        id: 'spot3',
        location: {
          name: 'モック観光地3',
          lat: 43.0618,
          lng: 141.3545,
        },
        spotId: 'spot3',
        image: 'https://example.com/spot3.jpg',
        url: 'https://example.com/cafe',
        prefecture: '東京都',
        address: '東京都渋谷区神南1-19-11',
        rating: 4.8,
        categories: ['aquarium'],
        catchphrase: '海の生き物たちと触れ合える場所です',
        description: '多様な海洋生物を観察できます。',
        regularOpeningHours: [
          { day: '月', hours: '9:00-18:00' },
          { day: '火', hours: '9:00-18:00' },
          { day: '水', hours: '9:00-18:00' },
          { day: '木', hours: '9:00-18:00' },
          { day: '金', hours: '9:00-18:00' },
          { day: '土', hours: '9:00-20:00' },
          { day: '日', hours: '9:00-20:00' },
        ],
        transports: {
          transportMethodIds: [3],
          travelTime: '60分',
          cost: 1000,
          fromType: 'SPOT',
          toType: 'SPOT',
        },
        stayStart: '09:00',
        stayEnd: '11:00',
        memo: 'モックスポット3のメモ',
        order: 1,
      },
      {
        id: 'destination_spot' + Math.random().toString(36).substring(2, 15),
        location: {
          name: '目的地',
          lat: 35.6762,
          lng: 139.6503,
        },
        spotId: 'destination_spot' + Math.random().toString(36).substring(2, 15),
        regularOpeningHours: [],
        transports: {
          transportMethodIds: [1],
          travelTime: '15分',
          cost: 300,
          fromType: 'SPOT',
          toType: 'DESTINATION',
        },
        stayStart: '18:00',
        stayEnd: '18:15',
        memo: '目的地のメモ',
        order: 2,
      },
    ],
  },
];

describe('旅行計画サービス', () => {
  const client = testClient(app) as any;

  // -- POST: 旅行計画の作成 --
  describe('POST /trips', () => {
    it('新しい旅行計画を作成できること', async () => {
      const result = TripSchema.safeParse({
        ...mockTripData,
        tripInfo: mockTripInfoData,
        plans: mockPlanData,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const res = await client.api.trips.create.$post({
          json: {
            ...mockTripData,
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        });
        expect(res.status).toBe(201);
        const createdTrip = await res.json();
        expect(createdTrip).toHaveProperty('id');
        expect(createdTrip).toHaveProperty('title', mockTripData.title);
        expect(Array.isArray(createdTrip.tripInfo)).toBe(true);
        expect(Array.isArray(createdTrip.plans)).toBe(true);

        // 詳細情報の確認
        createdTrip.plans.forEach((currentPlan: any) => {
          expect(currentPlan).toHaveProperty('date');
          expect(Array.isArray(currentPlan.planSpots)).toBe(true);
          currentPlan.planSpots.forEach((planSpot: any) => {
            expect(planSpot).toHaveProperty('id');
            expect(planSpot).toHaveProperty('stayStart');
            expect(planSpot).toHaveProperty('stayEnd');
            expect(planSpot).toHaveProperty('order');
            expect(planSpot).toHaveProperty('memo');
            // スポットのmeta情報も確認
            const spot = planSpot.spot.meta;
            // 追加のプロパティも確認可能
            expect(spot).toHaveProperty('url');
            expect(spot).toHaveProperty('prefecture');
            expect(spot).toHaveProperty('address');
            expect(spot).toHaveProperty('rating');
            expect(spot).toHaveProperty('categories');
            expect(spot).toHaveProperty('catchphrase');
            expect(spot).toHaveProperty('description');

            // 登録した内容が得られているかの確認
            const mockSpotData = mockPlanData.flatMap((plan) => plan.spots).find((s) => s.spotId === planSpot.spotId);
            if (mockSpotData) {
              expect(spot.url).toBe(mockSpotData.url);
              expect(spot.prefecture).toBe(mockSpotData.prefecture);
              expect(spot.address).toBe(mockSpotData.address);
              expect(spot.rating).toBe(mockSpotData.rating);
              expect(spot.catchphrase).toBe(mockSpotData.catchphrase);
              expect(spot.description).toBe(mockSpotData.description);
            }
          });
        });
      }
    });
  });

  // --- GET: 一覧取得 ---
  describe('GET /trips', () => {
    it('認証ユーザーの旅行計画一覧を取得できること', async () => {
      // 事前に旅行計画を作成
      await client.api.trips.create.$post({
        json: {
          ...mockTripData,
          tripInfo: mockTripInfoData,
          plans: mockPlanData,
        },
      });

      const res = await client.api.trips.$get({
        context: mockAuthenticatedContext(),
      });

      expect(res.status).toBe(200);
      const trips = await res.json();
      expect(Array.isArray(trips)).toBe(true);
      expect(trips.length).toBeGreaterThan(0);
      expect(trips[0]).toHaveProperty('title', mockTripData.title);
    });

    it('認証されていない場合、401エラーを返すこと', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });
      const res = await client.api.trips.$get();

      expect(res.status).toBe(401);
    });

    it('他のユーザーの旅行計画は取得できないこと', async () => {
      // 別ユーザーで旅行計画を作成
      const otherUserId = 'other_user_id';
      await createTestUser(otherUserId);
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: otherUserId });
      await client.api.trips.create.$post({
        json: {
          ...mockTripData,
          tripInfo: mockTripInfoData,
          plans: mockPlanData,
        },
      });
      // 元のユーザーに戻す
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: TEST_USER_ID });

      const res = await client.api.trips.$get({
        context: mockAuthenticatedContext(),
      });

      expect(res.status).toBe(200);
      const trips = await res.json();
      // 他ユーザーの旅行計画が含まれていないことを確認
      trips.forEach((trip: any) => {
        expect(trip.userId).toBe(TEST_USER_ID);
      });
    });

    it('旅行計画が存在しない場合、空配列を返すこと', async () => {
      // 事前にデータをクリア
      await clearTestData();
      await createTestUser(TEST_USER_ID);

      const res = await client.api.trips.$get({
        context: mockAuthenticatedContext(),
      });

      expect(res.status).toBe(200);
      const trips = await res.json();
      expect(Array.isArray(trips)).toBe(true);
      expect(trips.length).toBe(0);
    });
  });

  // --- GET: 詳細取得 ---
  describe('GET /trips/:id', () => {
    it('特定の旅行計画の詳細を取得できること', async () => {
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post({
        json: {
          ...mockTripData,
          tripInfo: mockTripInfoData,
          plans: mockPlanData,
        },
      });

      const result = await createdTrip.json();

      const res = await client.api.trips[result.id].$get();

      expect(res.status).toBe(200);
      const trip = await res.json();
      expect(trip).toHaveProperty('id', result.id);
      expect(trip).toHaveProperty('title', mockTripData.title);
      expect(Array.isArray(trip.tripInfo)).toBe(true);
      expect(Array.isArray(trip.plans)).toBe(true);

      // 詳細情報の中身も確認
      expect(trip.tripInfo.length).toBe(mockTripInfoData.length);
      expect(trip.plans.length).toBe(mockPlanData.length);
      // spot情報も確認
      trip.plans.forEach((plan: any) => {
        expect(plan).toHaveProperty('date');
        expect(Array.isArray(plan.planSpots)).toBe(true);
        plan.planSpots.forEach((spot: any) => {
          expect(spot).toHaveProperty('id');
          expect(spot).toHaveProperty('stayStart');
          expect(spot).toHaveProperty('stayEnd');
          expect(spot).toHaveProperty('order');
          expect(spot).toHaveProperty('memo');
          // 追加のプロパティも確認可能
          //TODO: 詳細なスポット情報の確認
        });
      });
    });

    it('存在しない旅行計画の詳細取得は404エラーを返すこと', async () => {
      const res = await client.api.trips[9999].$get({});

      expect(res.status).toBe(404);
    });
  });
});
