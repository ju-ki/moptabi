import { beforeAll, beforeEach, afterAll, describe, expect, it, setSystemTime } from 'bun:test';
import { testClient } from 'hono/testing';

import { TripSchema } from '@/models/trip';

import app from '..';
import {
  eq,
  clearAllTestData as clearTestData,
  clearUserTestData as clearTestDataForUser,
  connectDb as connectPrisma,
  createTestUser,
  disconnectDb as disconnectPrisma,
} from './db-helper';

// 認証用のモックユーザーID
const TEST_USER_ID = 'test_user_trip';

// テストファイル固有のSpot IDプレフィックス（並列実行時の衝突を防ぐ）
const SPOT_PREFIX = 'trip_svc_';

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
  // 現在日を一ヶ月前にする
  const prevDate = new Date('2023-12-01T12:00:00Z');
  setSystemTime(prevDate);
  currentUserId = TEST_USER_ID;
});

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
    transportationMethod: 1,
    memo: 'モックの旅行情報メモ',
  },
  {
    date: '2024-01-02',
    genreId: 2,
    transportationMethod: 2,
  },
];

const mockPlanData = [
  {
    date: '2024-01-01',
    spots: [
      {
        id: spotId('1'),
        location: {
          name: 'モック観光地1',
          lat: 35.6895,
          lng: 139.6917,
        },
        spotId: spotId('1'),
        image: 'https://example.com/spot1.jpg',
        url: 'https://example.com/cafe',
        prefecture: '東京都',
        address: '東京都渋谷区神南1-19-11',
        rating: 4.5,
        categories: ['museum', 'historical'],
        catchphrase: '歴史ある素晴らしい場所です',
        description: 'このスポットは多くの歴史的な価値を持っています。',
        regularOpeningHours: [
          { day: '月', hours: '9:00-17:00' },
          { day: '火', hours: '9:00-17:00' },
          { day: '水', hours: '9:00-17:00' },
          { day: '木', hours: '9:00-17:00' },
          { day: '金', hours: '9:00-17:00' },
          { day: '土', hours: '10:00-18:00' },
          { day: '日', hours: '10:00-18:00' },
        ],
        transports: {
          transportMethod: 1,
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
        id: spotId('2'),
        location: {
          name: 'モック観光地2',
          lat: 34.6937,
          lng: 135.5023,
        },
        spotId: spotId('2'),
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
          transportMethod: 2,
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
    ],
    departure: {
      name: '出発地',
      latitude: 35.6762,
      longitude: 139.6503,
      address: '東京都新宿区',
      label: null,
      isDefault: false,
      locationType: 'DEPARTURE',
      usageCount: null,
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
      latitude: 35.6762,
      longitude: 139.6503,
      address: '東京都渋谷区',
      label: null,
      isDefault: false,
      locationType: 'DESTINATION',
      usageCount: null,
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
  {
    date: '2024-01-02',
    spots: [
      {
        id: spotId('3'),
        location: {
          name: 'モック観光地3',
          lat: 43.0618,
          lng: 141.3545,
        },
        spotId: spotId('3'),
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
          transportMethod: 3,
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
    ],
    departure: {
      name: '出発地2',
      latitude: 35.6762,
      longitude: 139.6503,
      address: '東京都新宿区',
      label: null,
      isDefault: false,
      locationType: 'DEPARTURE',
      usageCount: null,
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
      name: '目的地2',
      latitude: 35.6762,
      longitude: 139.6503,
      address: '東京都渋谷区',
      label: null,
      isDefault: false,
      locationType: 'DESTINATION',
      usageCount: null,
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
        const res = await client.api.trips.create.$post(
          {
            json: {
              ...mockTripData,
              tripInfo: mockTripInfoData,
              plans: mockPlanData,
            },
          },
          { headers: getAuthHeaders() },
        );
        expect(res.status).toBe(201);
        const createdTrip = await res.json();
        // 作成した旅行計画のidが返却されることを確認
        expect(createdTrip).toHaveProperty('id');
        // 返却されたレスポンスに関係のない値が入っていないことの確認
        expect(createdTrip).not.toHaveProperty('title');
      }
    });
  });

  // --- GET: 一覧取得 ---
  describe('GET /trips', () => {
    it('認証ユーザーの旅行計画一覧を取得できること', async () => {
      // 事前に旅行計画を作成
      await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );

      const res = await client.api.trips.$get({}, { headers: getAuthHeaders() });

      expect(res.status).toBe(200);
      const trips = await res.json();
      expect(Array.isArray(trips)).toBe(true);
      expect(trips.length).toBeGreaterThan(0);
      expect(trips[0]).toHaveProperty('title', mockTripData.title);
    });

    it('認証されていない場合、401エラーを返すこと', async () => {
      currentUserId = null;
      const res = await client.api.trips.$get({}, { headers: getAuthHeaders() });

      expect(res.status).toBe(401);
    });

    it('他のユーザーの旅行計画は取得できないこと', async () => {
      // 別ユーザーで旅行計画を作成
      const otherUserId = 'other_user_id';
      await createTestUser(otherUserId);
      currentUserId = otherUserId;
      await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );
      // 元のユーザーに戻す
      currentUserId = TEST_USER_ID;

      const res = await client.api.trips.$get({}, { headers: getAuthHeaders() });

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
      await createTestUser(TEST_USER_ID, 'ADMIN');

      const res = await client.api.trips.$get({}, { headers: getAuthHeaders() });

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
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );

      const result = await createdTrip.json();

      const res = await client.api.trips[result.id].$get({}, { headers: getAuthHeaders() });

      expect(res.status).toBe(200);
      const trip = await res.json();
      expect(trip).toHaveProperty('title', mockTripData.title);
      expect(Array.isArray(trip.tripInfo)).toBe(true);
      expect(Array.isArray(trip.plans)).toBe(true);

      // 詳細情報の中身も確認
      expect(trip.tripInfo.length).toBe(mockTripInfoData.length);
      expect(trip.plans.length).toBe(mockPlanData.length);
    });

    it('存在しない旅行計画の詳細取得は404エラーを返すこと', async () => {
      const res = await client.api.trips[9999].$get({}, { headers: getAuthHeaders() });

      expect(res.status).toBe(404);
    });

    it('スポットはplaceIdのみ返し、SpotMetaの情報（name/latitude/longitude等）を含まないこと', async () => {
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );

      const result = await createdTrip.json();
      const res = await client.api.trips[result.id].$get({}, { headers: getAuthHeaders() });

      expect(res.status).toBe(200);
      const trip = await res.json();

      const firstSpot = trip.plans[0].spots[0];

      // placeIdが返ること
      expect(firstSpot).toHaveProperty('id');
      // スケジュール情報が返ること
      expect(firstSpot).toHaveProperty('stayStart');
      expect(firstSpot).toHaveProperty('stayEnd');
      expect(firstSpot).toHaveProperty('order');

      // SpotMetaの情報が返らないこと
      expect(firstSpot.location).toBeUndefined();
      expect(firstSpot.image).toBeUndefined();
      expect(firstSpot.url).toBeUndefined();
      expect(firstSpot.rating).toBeUndefined();
      expect(firstSpot.address).toBeUndefined();
      expect(firstSpot.prefecture).toBeUndefined();
      expect(firstSpot.category).toBeUndefined();
      expect(firstSpot.description).toBeUndefined();
      expect(firstSpot.catchphrase).toBeUndefined();
      expect(firstSpot.regularOpeningHours).toBeUndefined();
    });
  });

  // --- POST /trips: SpotMeta未登録テスト ---
  describe('POST /trips - SpotMeta登録検証', () => {
    it('Trip作成時にSpotMetaが登録されないこと', async () => {
      const newPlaceId = `${SPOT_PREFIX}no_meta_check`;

      const tripWithNewSpot = {
        ...mockTripData,
        tripInfo: [mockTripInfoData[0]],
        plans: [
          {
            date: '2024-01-01',
            spots: [
              {
                id: newPlaceId,
                location: {
                  name: 'TDDテストスポット',
                  lat: 35.6895,
                  lng: 139.6917,
                },
                image: 'https://example.com/test.jpg',
                url: 'https://example.com',
                prefecture: '東京都',
                address: '東京都新宿区',
                rating: 4.0,
                categories: ['park'],
                catchphrase: 'テストキャッチコピー',
                description: 'テスト説明',
                transports: {
                  transportMethod: 1,
                  travelTime: '10分',
                  cost: 200,
                  fromType: 'SPOT',
                  toType: 'SPOT',
                },
                stayStart: '10:00',
                stayEnd: '11:00',
                memo: '',
                order: 1,
              },
            ],
            departure: mockPlanData[0].departure,
            destination: mockPlanData[0].destination,
          },
        ],
      };

      const res = await client.api.trips.create.$post({ json: tripWithNewSpot }, { headers: getAuthHeaders() });
      expect(res.status).toBe(201);
      // No.230対応: SpotMeta/Spotテーブルは削除済み。placeIdはPlanSpot.spotIdに直接格納される。
      // テーブルへの直接クエリは不要。
    });
  });

  // --- ユーザーIDごとの旅行プラン数取得テスト ---
  describe('countTripByUserId', () => {
    it('複数のユーザーがそれぞれ異なる数の旅行プランを持つ場合、正しくカウントできること', async () => {
      // データをクリアして再構築
      await clearTestData();

      // テスト用ユーザーを3人作成
      const user1 = 'trip_count_test_user_1';
      const user2 = 'trip_count_test_user_2';
      const user3 = 'trip_count_test_user_3';
      await createTestUser(user1);
      await createTestUser(user2);
      await createTestUser(user3);

      // user1: 2件の旅行プランを作成
      currentUserId = user1;
      await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            title: 'User1の旅行1',
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );
      await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            title: 'User1の旅行2',
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );

      // user2: 1件の旅行プランを作成
      currentUserId = user2;
      await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            title: 'User2の旅行1',
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );

      // user3: 旅行プランを作成しない（0件）

      // カウント実行
      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId([user1, user2, user3]);

      // 検証
      expect(result[user1]).toBe(2);
      expect(result[user2]).toBe(1);
      expect(result[user3]).toBeUndefined(); // 旅行プランが0件の場合は含まれない
    });

    it('旅行プランを持たないユーザーは結果に含まれないこと', async () => {
      const userWithoutTrip = 'user_without_trip';
      await createTestUser(userWithoutTrip);

      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId([userWithoutTrip]);

      // 旅行プランが0件の場合は結果オブジェクトに含まれない
      expect(result[userWithoutTrip]).toBeUndefined();
      expect(Object.keys(result).length).toBe(0);
    });

    it('空の配列を渡した場合、空のオブジェクトを返すこと', async () => {
      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId([]);

      expect(result).toEqual({});
      expect(Object.keys(result).length).toBe(0);
    });

    it('指定したユーザーIDのみがカウントされること', async () => {
      // テスト用ユーザーを作成
      const targetUser = 'target_user_for_trip_count';
      const otherUser = 'other_user_for_trip_count';
      await createTestUser(targetUser);
      await createTestUser(otherUser);

      // 各ユーザーに旅行プランを作成
      currentUserId = targetUser;
      await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            title: 'ターゲットユーザーの旅行',
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );

      currentUserId = otherUser;
      await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            title: 'その他ユーザーの旅行',
            tripInfo: mockTripInfoData,
            plans: mockPlanData,
          },
        },
        { headers: getAuthHeaders() },
      );

      // targetUserのみを指定してカウント
      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId([targetUser]);

      // 検証: targetUserのみが含まれ、otherUserは含まれない
      expect(result[targetUser]).toBe(1);
      expect(result[otherUser]).toBeUndefined();
      expect(Object.keys(result).length).toBe(1);
    });

    it('同じユーザーが複数の旅行プランを持つ場合、正確にカウントされること', async () => {
      const userWithMany = 'user_with_many_trips';
      await createTestUser(userWithMany);

      currentUserId = userWithMany;

      // 5件の旅行プランを作成
      for (let i = 0; i < 5; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...mockTripData,
              title: `大量テスト用旅行${i}`,
              tripInfo: mockTripInfoData,
              plans: mockPlanData,
            },
          },
          { headers: getAuthHeaders() },
        );
      }

      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId([userWithMany]);

      expect(result[userWithMany]).toBe(5);
    });
  });

  // 前月のプラン数の増減の計算が正しいかのテスト
  describe('getPastTripStatistics', () => {
    it('旅行プランの総数、前月比増減数、平均旅程数の割合を正しく取得できること', async () => {
      // データをクリアして再構築
      await clearTestData();

      // テスト用ユーザーを3人作成
      const user1 = 'trip_count_test_user_1';
      const user2 = 'trip_count_test_user_2';
      const user3 = 'trip_count_test_user_3';
      await createTestUser(user1);
      await createTestUser(user2);
      await createTestUser(user3);

      currentUserId = user1;
      // 現在日を一ヶ月前にする
      const prevDate = new Date('2023-12-01T12:00:00Z');
      setSystemTime(prevDate);
      // 1件✖️2日の前月の旅行プランを作成
      for (let i = 0; i < 1; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...mockTripData,
              title: `大量テスト用旅行${i}`,
              tripInfo: mockTripInfoData,
              plans: mockPlanData,
            },
          },
          { headers: getAuthHeaders() },
        );
      }

      // 元に戻す
      const date = new Date('2024-01-01T12:00:00Z');
      setSystemTime(date);
      // 1件✖️2日の当月の旅行プランを作成
      for (let i = 0; i < 1; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...mockTripData,
              title: `大量テスト用旅行${i}`,
              tripInfo: mockTripInfoData,
              plans: mockPlanData,
            },
          },
          { headers: getAuthHeaders() },
        );
      }

      // 1件 + 3件 = 合計4件の旅程
      // 期待値としては、総プラン数4、前月比増減数2、平均旅程数の割合8/4=2となるはず
      const { getTripStatistics } = await import('@/services/trip');
      const stats = await getTripStatistics();

      expect(stats.totalPlans).toBe(2);
      expect(stats.planIncreaseFromLastMonth).toBe(2);
      expect(stats.averageDatePerUserPlan).toBeCloseTo(2);
    });
  });
  // 総プラン数の取得と平均旅程数の割合テスト
  describe('getTripStatistics', () => {
    it('前月からの増減を正しく計算できること', async () => {
      // データをクリアして再構築
      await clearTestData();

      // テスト用ユーザーを3人作成
      const user1 = 'trip_count_test_user_1';
      const user2 = 'trip_count_test_user_2';
      const user3 = 'trip_count_test_user_3';
      await createTestUser(user1);
      await createTestUser(user2);
      await createTestUser(user3);

      currentUserId = user1;

      // 1件✖️2日の旅行プランを作成
      for (let i = 0; i < 1; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...mockTripData,
              title: `大量テスト用旅行${i}`,
              tripInfo: mockTripInfoData,
              plans: mockPlanData,
            },
          },
          { headers: getAuthHeaders() },
        );
      }

      currentUserId = user2;
      // 3件✖️2日の旅行プランを作成
      for (let i = 0; i < 3; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...mockTripData,
              title: `大量テスト用旅行${i}`,
              tripInfo: mockTripInfoData,
              plans: mockPlanData,
            },
          },
          { headers: getAuthHeaders() },
        );
      }
      // 1件 + 3件 = 合計4件の旅程
      // 期待値としては、総プラン数4、前月比増減数4、平均旅程数の割合8/4=2となるはず
      const { getTripStatistics } = await import('@/services/trip');
      const stats = await getTripStatistics();

      expect(stats.totalPlans).toBe(4);
      expect(stats.planIncreaseFromLastMonth).toBe(4);
      expect(stats.averageDatePerUserPlan).toBeCloseTo(2);
    });
  });
});
