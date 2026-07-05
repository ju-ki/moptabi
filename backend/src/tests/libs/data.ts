/**
 * テストデータ置き場(テストが膨らんできたため対応)
 */

import { createSpotData } from '../test-client';

// テストファイル固有のSpot IDプレフィックス（並列実行時の衝突を防ぐ）
export const SPOT_PREFIX = 'trip_svc_';

// 認証用のモックユーザーID
export const TEST_USER_ID = 'test_user_trip';

// Spot IDを生成するヘルパー関数
export function spotId(id: string): string {
  return `${SPOT_PREFIX}${id}`;
}

// 現在の認証ユーザーIDを保持する変数
export const currentUserId: string | null = TEST_USER_ID;

// モックtripデータ
export const mockTripData = {
  title: 'モック旅行タイトル',
  imageUrl: 'https://example.com/mock-image.jpg',
  startDate: '2024-01-01',
  endDate: '2024-01-02',
};

// モックtripInfoデータ
export const mockTripInfoData = [
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

/** 最寄駅なし旅行計画データ */
export const mockPlanData = [
  {
    date: '2024-01-01',
    spots: [
      createSpotData(
        Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
        '10:00',
        '12:00',
        120,
        1,
        {
          transportMethod: 1,
          travelTime: '30分',
          cost: 500,
          fromType: 'DEPARTURE',
          toType: 'SPOT',
        },
        undefined,
      ),
      createSpotData(
        Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
        '14:00',
        '16:00',
        120,
        2,
        {
          transportMethod: 2,
          travelTime: '45分',
          cost: 700,
          fromType: 'SPOT',
          toType: 'DESTINATION',
        },
        undefined,
      ),
    ],
    departure: {
      name: '出発地',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '09:00',
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
      time: '18:00',
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
      createSpotData(
        Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
        '09:00',
        '11:00',
        120,
        1,
        {
          transportMethod: 3,
          travelTime: '60分',
          cost: 1000,
          fromType: 'DEPARTURE',
          toType: 'SPOT',
        },
        undefined,
      ),
    ],
    departure: {
      name: '出発地2',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '09:00',
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
      time: '18:00',
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

export const mockPlanDataWithNearestStation = [
  {
    date: '2024-01-01',
    spots: [
      createSpotData(
        Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
        '10:00',
        '12:00',
        120,
        1,
        {
          transportMethod: 4,
          travelTime: '30分',
          cost: 500,
          fromType: 'DEPARTURE',
          toType: 'SPOT',
        },
        {
          placeId: Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
          stationType: 'TRAIN',
          transitTime: 10,
          scheduledDepartureTime: '10:00',
          memo: '出発地駅からの移動メモ',
        },
      ),
      createSpotData(
        Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
        '14:00',
        '16:00',
        120,
        2,
        {
          transportMethod: 4,
          travelTime: '45分',
          cost: 700,
          fromType: 'SPOT',
          toType: 'DESTINATION',
        },
        {
          placeId: Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
          stationType: 'TRAIN',
          transitTime: 10,
          scheduledDepartureTime: '11:00',
          memo: '自動検出駅2からの移動メモ',
        },
      ),
    ],
    departure: {
      name: '出発地',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '09:00',
      label: null,
      isDefault: false,
      locationType: 'DEPARTURE',
      usageCount: null,
      userLocationId: null,
      planLocationId: null,
      nearestStation: {
        placeId: Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
        stationType: 'TRAIN',
        transitTime: 10,
        scheduledDepartureTime: '10:00',
        memo: '出発地駅からの移動メモ',
      },
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
      time: '18:00',
      label: null,
      isDefault: false,
      locationType: 'DESTINATION',
      usageCount: null,
      userLocationId: null,
      planLocationId: null,
      nearestStation: {
        placeId: Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
        stationType: 'TRAIN',
        transitTime: 10,
        scheduledDepartureTime: '10:00',
        memo: '目的地駅からの移動メモ',
      },
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
        id: spotId(Math.random().toString(36).substring(2, 15)),
        location: {
          name: 'モック観光地3',
          lat: 43.0618,
          lng: 141.3545,
        },
        spotId: spotId('15'),
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
      time: '09:00',
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
      time: '18:00',
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
