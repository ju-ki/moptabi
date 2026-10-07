import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { executePlanning } from '@/lib/planning';

import { mockGetRoute, createBaseParams, createRouteResult, createTwoSpotParams } from './fixtures';

describe('planning.ts: 最寄駅経由の時間計算', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('travelTime+nearestStationの項目の検証(最寄駅あり)', () => {
    it('出発地', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 12,
        scheduledDepartureTimes: ['09:20', '09:30', '09:40'],
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        stationType: 'TRAIN',
        transitTime: 10,
        walkingTime: 8,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const targetRoute = result.routes[0];
      const updatedDeparture = result.updatedDeparture;

      // 出発時間~最初のスポットの移動時間
      expect(updatedDeparture.travelTime).toBe(40); // 10分(徒歩) + 10分(待機) + 12分(乗車) + 8分(徒歩)
      expect(updatedDeparture.transportMethodId).toBe(4);
      expect(updatedDeparture.transportMethod).toBe('TRANSIT');
      // 出発地の最寄駅計算結果を検証
      expect(updatedDeparture).toBeDefined();
      expect(updatedDeparture.nearestStation?.scheduledDepartureTime).toBeDefined();
      expect(updatedDeparture.nearestStation?.waitingTime).toBeTypeOf('number');
      expect(updatedDeparture.nearestStation?.transitTime).toBe(12);

      // ルート情報の時間が一致していること
      expect(targetRoute.duration).toEqual(updatedDeparture.travelTime);
    });

    it('スポット', async () => {
      const params = createTwoSpotParams(30);
      params.spots[0].nearestStation = {
        placeId: 'spot2-station',
        name: '品川駅',
        stationType: 'TRAIN',
        transitTime: 10,
        walkingTime: 7,
        latitude: 35.6284,
        longitude: 139.7387,
        scheduledDepartureTimes: ['11:00', '11:15', '11:30'],
      };
      params.spots[1].nearestStation = {
        spotId: 'destination',
        placeId: 'dest-station',
        name: '羽田空港第1ターミナル駅',
        stationType: 'TRAIN',
        walkingTime: 6,
        latitude: 35.5494,
        longitude: 139.7798,
        transitTime: 18,
        scheduledDepartureTimes: ['11:00', '11:15', '11:30'],
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const targetRoute = result.routes[1];
      const updatedSpots = result.updatedSpots;
      // 最初のスポット~次のスポットの移動時間(stayEndが09:45)
      expect(updatedSpots[0].travelTime).toBe(91); // 7分(徒歩) + 68分(待機(09:52-11:00)) + 10分(乗車) + 6分(徒歩)
      expect(updatedSpots[0].transportMethodId).toBe(4);
      expect(updatedSpots[0].transportMethod).toBe('TRANSIT');

      expect(updatedSpots[0]).toBeDefined();
      expect(updatedSpots[0].nearestStation?.scheduledDepartureTime).toBeDefined();
      expect(updatedSpots[0].nearestStation?.waitingTime).toBeTypeOf('number');
      expect(updatedSpots[0].nearestStation?.transitTime).toBe(10);

      // ルート情報の時間が一致していること
      expect(targetRoute.duration).toEqual(updatedSpots[0].travelTime);
    });

    it('目的地', async () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1];
      params.spots[1].nearestStation = {
        placeId: 'spot2-station',
        name: '品川駅',
        stationType: 'TRAIN',
        transitTime: 10,
        walkingTime: 7,
        latitude: 35.6284,
        longitude: 139.7387,
      };
      params.destination.nearestStation = {
        spotId: 'destination',
        placeId: 'dest-station',
        name: '羽田空港第1ターミナル駅',
        stationType: 'TRAIN',
        walkingTime: 6,
        latitude: 35.5494,
        longitude: 139.7798,
        transitTime: 0,
        scheduledDepartureTimes: ['11:00', '11:15', '11:30'],
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const targetRoute = result.routes[2];
      const updatedDestination = result.updatedDestination;
      const updatedLastSpot = result.updatedSpots[1];
      // 最後のスポット~目的地の移動時間(stayEndが11:00)
      expect(updatedLastSpot.travelTime).toBe(31); // 7分(徒歩) + 8分(待機(11:07-11:15)) + 10分(乗車) + 6分(徒歩)
      expect(updatedLastSpot.transportMethodId).toBe(4);
      expect(updatedLastSpot.transportMethod).toBe('TRANSIT');

      expect(updatedDestination.travelTime).toBe(0);
      expect(updatedDestination.transportMethodId).toBe(0);
      expect(updatedDestination.transportMethod).toBe('DEFAULT');

      expect(updatedLastSpot).toBeDefined();
      expect(updatedLastSpot.nearestStation?.scheduledDepartureTime).toBeDefined();
      expect(updatedLastSpot.nearestStation?.waitingTime).toBeTypeOf('number');
      expect(updatedLastSpot.nearestStation?.transitTime).toBe(10);

      expect(targetRoute.duration).toEqual(updatedLastSpot.travelTime);
      expect(result.routes[3]).toBeUndefined();
    });
  });
});
