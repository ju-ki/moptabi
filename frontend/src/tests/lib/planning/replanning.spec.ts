import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { executePlanning } from '@/lib/planning';

import { mockGetRoute, createBaseParams, createRouteResult, createTwoSpotParams } from './fixtures';

describe('planning.ts: 再プランニング', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('再プランニング時における区間優先移動手段の採用ルール(最寄駅あり)', () => {
    it('出発地', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1, 2, 3];
      params.preferredTransportMethodIds = {
        DEPARTURE_TO_FIRST_SPOT: 3,
      };
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: ['09:20', '09:30'],
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        transitTime: 10,
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await executePlanning(params);
      const departureToSpotRoute = result.updatedDeparture;

      expect(departureToSpotRoute).toBeDefined();
      expect(departureToSpotRoute?.transportMethodId).toBe(3);
      expect(departureToSpotRoute?.transportMethod).toBe('DRIVING');
    });
    it('スポット間', async () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1, 2, 3];
      const segmentKey = `SPOT_${params.spots[0].id}_TO_${params.spots[1].id}`;
      params.preferredTransportMethodIds = {
        [segmentKey]: 3,
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        transitTime: 10,
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };
      params.spots[1].nearestStation = {
        placeId: 'spot-station-2',
        name: '渋谷駅',
        transitTime: 10,
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.658034,
        longitude: 139.701636,
      };

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await executePlanning(params);
      const spotToSpotRoute = result.updatedSpots[0];

      expect(spotToSpotRoute).toBeDefined();
      expect(spotToSpotRoute.transportMethodId).toBe(3);
      expect(spotToSpotRoute.transportMethod).toBe('DRIVING');
    });
    it('目的地', async () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1, 2, 3];
      const segmentKey = `SPOT_${params.spots[1].id}_TO_DESTINATION`;
      params.preferredTransportMethodIds = {
        [segmentKey]: 3,
      };
      params.spots[1].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        transitTime: 10,
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };
      params.destination.nearestStation = {
        spotId: 'destination',
        placeId: 'dest-station',
        name: '東京駅',
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: ['09:20', '09:30'],
      };

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await executePlanning(params);
      const updatedLastSpot = result.updatedSpots[1];
      const destinationToSpotRoute = result.updatedDestination;

      expect(destinationToSpotRoute).toBeDefined();
      expect(destinationToSpotRoute.transportMethodId).toBe(0);
      expect(destinationToSpotRoute.transportMethod).toBe('DEFAULT');

      expect(updatedLastSpot.transportMethodId).toBe(3);
      expect(updatedLastSpot.transportMethod).toBe('DRIVING');
    });
  });
  describe('再プランニング時における区間優先移動手段の採用ルール(最寄駅なし)', () => {
    it('出発地', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1, 2, 3];
      params.preferredTransportMethodIds = {
        DEPARTURE_TO_FIRST_SPOT: 2,
      };

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await executePlanning(params);
      const departureToSpotRoute = result.updatedDeparture;

      expect(departureToSpotRoute).toBeDefined();
      expect(departureToSpotRoute?.transportMethodId).toBe(2);
      expect(departureToSpotRoute?.transportMethod).toBe('BICYCLING');
    });
    it('スポット間', async () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1, 2, 3];
      const segmentKey = `SPOT_${params.spots[0].id}_TO_${params.spots[1].id}`;
      params.preferredTransportMethodIds = {
        [segmentKey]: 2,
      };

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await executePlanning(params);
      const spotToSpotRoute = result.updatedSpots[0];

      expect(spotToSpotRoute).toBeDefined();
      expect(spotToSpotRoute.transportMethodId).toBe(2);
      expect(spotToSpotRoute.transportMethod).toBe('BICYCLING');
    });
    it('目的地', async () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1, 2, 3];
      const segmentKey = `SPOT_${params.spots[1].id}_TO_DESTINATION`;
      params.preferredTransportMethodIds = {
        [segmentKey]: 2,
      };

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await executePlanning(params);
      const updatedLastSpot = result.updatedSpots[1];
      const destinationToSpotRoute = result.updatedDestination;

      expect(destinationToSpotRoute).toBeDefined();
      expect(destinationToSpotRoute.transportMethodId).toBe(0);
      expect(destinationToSpotRoute.transportMethod).toBe('DEFAULT');

      expect(updatedLastSpot.transportMethodId).toBe(2);
      expect(updatedLastSpot.transportMethod).toBe('BICYCLING');
    });
  });
});
