import { testClient } from 'hono/testing';
import { NearestStationType } from '@shared/nearestStation/types';
import { TransportMethodType } from '@shared/transports/types';

import { TripDetailResponseType, TripDetailSpotType } from '@/models/trip';

import app from '..';
import { mockPlanData, mockTripData, spotId } from './libs/data';

// テスト用ユーザーID
export const TEST_USER_ID = 'test_user_id';

/**
 * 認証ヘッダー付きのテストクライアントを作成
 */
export function createAuthHeaders(userId: string = TEST_USER_ID) {
  return {
    'X-User-Id': userId,
  };
}

/**
 * テストクライアントのインスタンスを取得
 */
export function getTestClient() {
  return testClient(app) as any;
}

/**
 * テスト用のスポットデータを作成するユーティリティ関数
 * @param id スポットID
 * @param string stayStart 滞在開始時間
 * @param string stayEnd 滞在終了時間
 * @param number stayDuration 滞在時間（分）
 * @param number order スポットの順序
 * @param any nearestStation 最寄り駅情報
 * @returns テスト用のスポットデータオブジェクト
 */
export function createSpotData(
  id: string,
  stayStart: string = '10:00',
  stayEnd: string = '12:00',
  stayDuration: number = 60,
  order: number = 1,
  transportMethodId: number = 1,
  transportMethod: TransportMethodType = 'WALKING',
  travelTime: number = 15,
  nearestStation: NearestStationType | undefined = {
    placeId: Math.random().toString(36).substring(2, 15), // ランダムなIDを生成
    stationType: 'TRAIN',
    transitTime: 10,
    waitingTime: 5,
    scheduledDepartureTime: '10:00',
    memo: '出発地駅からの移動メモ',
  },
) {
  return {
    id: spotId(id),
    spotId: spotId(id),
    location: {
      name: `モック観光地${id}`,
      lat: 35.6895,
      lng: 139.6917,
    },
    rating: 4.5,
    categories: ['文化'],
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
    image: 'https://example.com/image.jpg',
    prefecture: '東京都',
    address: '東京都千代田区',
    nearestStation,
    stayStart,
    stayEnd,
    stayDuration,
    memo: `モックスポット${id}のメモ`,
    order,
    transportMethodId,
    transportMethod,
    travelTime,
  };
}

/**
 * trip.serviceを介して旅行計画を作成するヘルパー関数
 * @param params 旅行計画のパラメータ
 * @returns 作成した旅行計画
 */
export async function createTripViaTripService(params: {
  title: string;
  startDate: string;
  endDate: string;
  userId?: string;
  spots: Array<{
    spotId: string;
    name: string;
    lat?: number;
    lng?: number;
    stayStart: string;
    stayEnd: string;
    stayDuration: number;
    order: number;
    nearestStation: any;
  }>;
}) {
  const { title, startDate, endDate, spots, userId } = params;
  const client = getTestClient();

  // spotデータをAPIフォーマットに変換
  const planSpots = spots.map((spot, index) => {
    return createSpotData(
      `${spot.spotId}`,
      spot.stayStart,
      spot.stayEnd,
      spot.stayDuration,
      spot.order,
      spot.nearestStation,
    );
  });

  const response = await client.api.trips.create.$post(
    {
      json: {
        ...structuredClone(mockTripData),
        title,
        startDate,
        endDate,
        plans: structuredClone(mockPlanData).map((plan, index) => ({
          ...plan,
          date: startDate, // すべてのプランの日付をstartDateに設定
          spots: planSpots.filter((spot) => spot.order === index + 1), // プランごとにスポットを割り当て
        })),
      },
    },
    { headers: createAuthHeaders(userId || TEST_USER_ID) },
  );

  if (response.status !== 201) {
    throw new Error(`Failed to create trip: ${response.status}`);
  }

  return response.json();
}
