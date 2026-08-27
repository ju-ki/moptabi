/**
 * テストデータ置き場(テストが膨らんできたため対応)
 */

import { PlanType } from '@shared/plan/types';

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

const spot1 = createSpotData('1');
const spot2 = createSpotData('2');

/** 最寄駅なし旅行計画データ */
export const mockPlanData: Array<PlanType> = [
  {
    date: '2024-01-01',
    spots: [spot1, spot2],
    departure: {
      name: '出発地',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '09:00',
      locationType: 'DEPARTURE',
      transportMethodId: 1,
      transportMethod: 'WALKING',
      travelTime: 15,
    },
    destination: {
      name: '目的地',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '18:00',
      locationType: 'DESTINATION',
      transportMethodId: 1,
      transportMethod: 'DEFAULT',
      travelTime: 15,
    },
  },
  {
    date: '2024-01-02',
    spots: [spot1],
    departure: {
      name: '出発地2',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '09:00',
      locationType: 'DEPARTURE',
      transportMethod: 'WALKING',
      transportMethodId: 1,
      travelTime: 15,
    },
    destination: {
      name: '目的地2',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '18:00',
      locationType: 'DESTINATION',
      transportMethodId: 0,
      transportMethod: 'DEFAULT',
      travelTime: 15,
    },
  },
];

export const mockPlanDataWithNearestStation: Array<PlanType> = [
  {
    date: '2024-01-01',
    spots: [
      createSpotData(
        'spot_1', // ランダムなIDを生成
        '10:00',
        '12:00',
        120,
        1,
        1,
        'WALKING',
        15,
        {
          placeId: 'spot_1',
          stationType: 'TRAIN',
          transitTime: 10,
          scheduledDepartureTime: '10:00',
          memo: 'スポット1からの移動メモ',
        },
      ),
      createSpotData(
        'spot_2', // ランダムなIDを生成
        '14:00',
        '16:00',
        120,
        2,
        1,
        'WALKING',
        15,
        {
          placeId: 'spot_2',
          stationType: 'TRAIN',
          transitTime: 15,
          scheduledDepartureTime: '11:00',
          memo: 'スポット2からの移動メモ',
        },
      ),
    ],
    departure: {
      name: '出発地',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '09:00',
      locationType: 'DEPARTURE',
      transportMethod: 'WALKING',
      transportMethodId: 1,
      travelTime: 15,
      nearestStation: {
        placeId: 'departure_station_place_id',
        stationType: 'TRAIN',
        transitTime: 10,
        scheduledDepartureTime: '10:00',
        memo: '出発地駅からの移動メモ',
      },
    },
    destination: {
      name: '目的地',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '18:00',
      locationType: 'DESTINATION',
      transportMethod: 'DEFAULT',
      transportMethodId: 0,
      travelTime: 0,
      nearestStation: {
        placeId: 'destination_station_place_id',
        stationType: 'TRAIN',
        transitTime: 10,
        scheduledDepartureTime: '10:00',
        memo: '目的地駅からの移動メモ',
      },
    },
  },
  {
    date: '2024-01-02',
    spots: [
      {
        id: spotId(Math.random().toString(36).substring(2, 15)),
        stayStart: '09:00',
        stayEnd: '11:00',
        stayDuration: 120,
        memo: 'モックスポット3のメモ',
        order: 1,
        transportMethod: 'WALKING',
        transportMethodId: 1,
        travelTime: 15,
      },
    ],
    departure: {
      name: '出発地2',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '09:00',
      locationType: 'DEPARTURE',
      transportMethod: 'WALKING',
      transportMethodId: 1,
      travelTime: 15,
    },
    destination: {
      name: '目的地2',
      latitude: 35.6762,
      longitude: 139.6503,
      time: '18:00',
      locationType: 'DESTINATION',
      transportMethod: 'DEFAULT',
      transportMethodId: 0,
      travelTime: 15,
    },
  },
];
