import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { executePlanning } from '@/lib/planning';

import {
  mockGetRoute,
  createBaseParams,
  createRouteResult,
  PLANNING_MATRIX_CASES,
  createPlanningParamsFromMatrix,
  createTwoSpotParams,
  setupDeterministicRouteMock,
} from './fixtures';

describe('planning.ts: プランニングのアウトプット結果', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('プランニング結果としてルート情報、出発時刻、到着時刻、メッセージ、到着超過判定を返す', async () => {
    const params = createBaseParams();
    params.transportMethodIds = [1];
    params.destination.time = '11:00';

    mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

    const result = await executePlanning(params);

    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.routes.some((route) => route.routeType === 'DEPARTURE_TO_SPOT')).toBe(true);
    expect(result.routes.some((route) => route.routeType === 'SPOT_TO_DESTINATION')).toBe(true);
    expect(result.departureTime).toBe('09:00');
    expect(result.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.isOverTime).toBe(false);
  });

  it('到着時間を超過した場合は isOverTime=true を返す', async () => {
    const params = createBaseParams();
    params.transportMethodIds = [1];
    params.destination.time = '09:20';

    mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

    const result = await executePlanning(params);

    expect(result.isOverTime).toBe(true);
    expect(result.arrivalTime).toBe('10:30');
  });

  it('最寄駅候補が未入力の区間では注意/警告メッセージを返す', async () => {
    const params = createBaseParams();
    params.transportMethodIds = [1];
    params.departure.nearestStation = {
      spotId: 'departure',
      name: '東京駅',
      walkingTime: 10,
      latitude: 35.681236,
      longitude: 139.767125,
      placeId: 'dep-station',
      transitTime: 10,
      scheduledDepartureTimes: [],
      stationType: 'TRAIN',
    };
    params.spots[0].nearestStation = {
      name: '新宿駅',
      stationType: 'TRAIN',
      transitTime: 10,
      walkingTime: 10,
      latitude: 35.6895,
      longitude: 139.7004,
      placeId: 'spot-station',
    };

    mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

    const result = await executePlanning(params);

    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0].level).toBe('WARNING');
    expect(result.messages[0].message).toContain('最寄駅到着の1分後');
    expect(result.routes.some((route) => route.useNearestStation)).toBe(true);
  });

  describe('travelTimeの検証(最寄駅なし)', () => {
    it('出発地', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const updatedDeparture = result.updatedDeparture;

      // 出発時間~最初のスポットの移動時間
      expect(updatedDeparture.travelTime).toBe(15); // ルートAPIの結果をそのまま採用するため、徒歩15分のみ
      expect(updatedDeparture.transportMethodId).toBe(1);
      expect(updatedDeparture.transportMethod).toBe('WALKING');
      expect(updatedDeparture.nearestStation).toBeUndefined();
    });

    it('スポット', async () => {
      const params = createTwoSpotParams(30);

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const updatedSpots = result.updatedSpots;
      // 最初のスポット~次のスポットの移動時間
      expect(updatedSpots[0].travelTime).toBe(15); // ルートAPIの結果をそのまま採用するため、徒歩15分のみ
      expect(updatedSpots[0].transportMethodId).toBe(1);
      expect(updatedSpots[0].transportMethod).toBe('WALKING');
      expect(updatedSpots[0].nearestStation).toBeUndefined();
    });

    it('目的地', async () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1];

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const updatedDestination = result.updatedDestination;
      const updatedLastSpot = result.updatedSpots[1];
      // 最後のスポット~目的地
      expect(updatedLastSpot.travelTime).toBe(15); // ルートAPIの結果をそのまま採用するため、徒歩15分のみ
      expect(updatedLastSpot.transportMethodId).toBe(1);
      expect(updatedLastSpot.transportMethod).toBe('WALKING');
      expect(updatedLastSpot.nearestStation).toBeUndefined();

      // 目的地は次のルート情報がないので
      expect(updatedDestination.travelTime).toBe(0); // ルートAPIの結果をそのまま採用するため、徒歩15分のみ
      expect(updatedDestination.transportMethodId).toBe(0);
      expect(updatedDestination.transportMethod).toBe('DEFAULT');
      expect(updatedDestination.nearestStation).toBeUndefined();
    });
  });

  it.each(PLANNING_MATRIX_CASES)('[%s] 総移動時間は選択ルートduration合計（分）と一致する', async (matrixCase) => {
    setupDeterministicRouteMock();
    const params = createPlanningParamsFromMatrix(matrixCase, 60);

    const result = await executePlanning(params);

    const expectedDurationSeconds = result.routes.reduce((sum, route) => sum + route.duration, 0);
    expect(result.totalDuration).toBe(expectedDurationSeconds);
  });

  it.each(PLANNING_MATRIX_CASES)('[%s] 総移動距離は選択ルートdistance合計（m）と一致する', async (matrixCase) => {
    setupDeterministicRouteMock();
    const params = createPlanningParamsFromMatrix(matrixCase, 60);

    const result = await executePlanning(params);

    const expectedDistanceMeters = result.routes.reduce((sum, route) => sum + route.distance, 0);
    expect(result.totalDistance).toBe(expectedDistanceMeters);
    expect(result.totalDistance).toBeGreaterThan(0);
  });

  it.each(PLANNING_MATRIX_CASES)('[%s] アウトプット結果に正しいRouteInfo情報が含まれる', async (matrixCase) => {
    setupDeterministicRouteMock();
    const params = createPlanningParamsFromMatrix(matrixCase, 60);

    const result = await executePlanning(params);

    const routeInfos = result.routes;
    routeInfos.forEach((routeInfo) => {
      // 中身の確認
      expect(routeInfo.fromSpotId).toBeDefined();
      expect(routeInfo.toSpotId).toBeDefined();
      expect(routeInfo.fromType).toBeDefined();
      expect(routeInfo.toType).toBeDefined();
      expect(routeInfo.routeType).toBeDefined();
      expect(routeInfo.transportMethodId).toBeDefined();
      expect(routeInfo.transportMethod).toBeDefined();
      expect(routeInfo.duration).toBeGreaterThan(0);
      expect(routeInfo.distance).toBeGreaterThan(0);
      expect(routeInfo.polyline).toBeDefined();
      expect(routeInfo.alternativeRoutes).toBeDefined();

      // 移動手段が最寄駅の場合の確認
      if (routeInfo.transportMethodId === 4) {
        expect(routeInfo.useNearestStation).toBe(true);
        expect(['TO_STATION', 'STATION_TO_STATION']).toContain(routeInfo.routeType);
      }

      // fromTypeとtoTypeの組み合わせからrouteTypeが正しいかを確認(最寄駅経由を除く)
      if (routeInfo.transportMethodId != 4) {
        if (routeInfo.fromType == 'DEPARTURE') {
          expect(routeInfo.routeType).toBe('DEPARTURE_TO_SPOT');
        }
        if (routeInfo.fromType == 'SPOT' && routeInfo.toType == 'SPOT') {
          expect(routeInfo.routeType).toBe('SPOT_TO_SPOT');
        }
        if (routeInfo.toType == 'DESTINATION') {
          expect(routeInfo.routeType).toBe('SPOT_TO_DESTINATION');
        }
      }

      if (routeInfo.transportMethodId == 4) {
        expect(routeInfo.routeType).toBe('TO_STATION');
      }
    });
  });
});
