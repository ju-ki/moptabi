import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { executePlanning } from '@/lib/planning';
import { PLANNING_MESSAGE_SEGMENT } from '@/data/constants';

import {
  mockGetRoute,
  createBaseParams,
  createRouteResult,
  createStation,
  createTwoSpotParams,
  setupDeterministicRouteMock,
} from './fixtures';

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
        // 最後の区間の発車時間候補は、出発側（最終スポット）のカードで入力する
        scheduledDepartureTimes: ['11:00', '11:15', '11:30'],
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

  describe('発車時間候補の参照先と保存値（B2・B3）', () => {
    it('T4: 最後の区間は最終スポットの発車時間候補を使う', async () => {
      setupDeterministicRouteMock();
      const params = createTwoSpotParams(30);
      // 09:00 + 15分 → スポット1 滞在 30分 → 15分 → スポット2 滞在 60分 → 11:00 出発、駅到着 11:10
      params.spots[1].nearestStation = createStation('spot2-station', { scheduledDepartureTimes: ['12:30'] });
      params.destination.nearestStation = createStation('dest-station');

      const result = await executePlanning(params);
      const lastSpot = result.updatedSpots[1];

      expect(lastSpot.transportMethodId).toBe(4);
      expect(lastSpot.nearestStation?.scheduledDepartureTime).toBe('12:30');
      expect(lastSpot.nearestStation?.waitingTime).toBe(80);
      expect(lastSpot.nearestStation?.scheduledDepartureTimes).toEqual(['12:30']);
      expect(
        result.messages.some((message) =>
          message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY),
        ),
      ).toBe(false);
    });

    it.each([
      ['出発地 → スポット1', 'DEPARTURE'],
      ['スポット間', 'SPOT'],
      ['最終スポット → 目的地', 'LAST_SPOT'],
    ] as const)('T5: %s で発車時間候補が空のとき、保存される候補は空のまま', async (_label, segment) => {
      setupDeterministicRouteMock();
      const params = createTwoSpotParams(30);
      if (segment === 'DEPARTURE') {
        params.departure.nearestStation = createStation('dep-station');
        params.spots[0].nearestStation = createStation('spot1-station');
      } else if (segment === 'SPOT') {
        params.spots[0].nearestStation = createStation('spot1-station');
        params.spots[1].nearestStation = createStation('spot2-station');
      } else {
        params.spots[1].nearestStation = createStation('spot2-station');
        params.destination.nearestStation = createStation('dest-station');
      }

      const result = await executePlanning(params);
      const fromNode =
        segment === 'DEPARTURE'
          ? result.updatedDeparture
          : segment === 'SPOT'
            ? result.updatedSpots[0]
            : result.updatedSpots[1];

      expect(fromNode.transportMethodId).toBe(4);
      expect(fromNode.nearestStation?.scheduledDepartureTimes).toEqual([]);
      expect(fromNode.nearestStation?.scheduledDepartureTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('最後の区間を計算しても、目的地の最寄駅の乗車時間は上書きしない', async () => {
      setupDeterministicRouteMock();
      const params = createTwoSpotParams(30);
      params.spots[1].nearestStation = createStation('spot2-station');
      params.destination.nearestStation = createStation('dest-station', { transitTime: 12 });

      const result = await executePlanning(params);

      expect(result.updatedDestination.nearestStation?.transitTime).toBe(12);
    });
  });

  describe('片側だけ最寄駅がある区間（B9）', () => {
    it('警告を出し、同じ区間の長距離徒歩メッセージは出さない', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = createStation('dep-station');

      const result = await executePlanning(params);
      const segmentKeys = result.messages.map((message) => message.segmentKey);

      expect(result.routes[0].transportMethodId).toBe(1);
      expect(result.messages).toContainEqual({
        level: 'WARNING',
        segmentKey: `${PLANNING_MESSAGE_SEGMENT.NEAREST_STATION_ONE_SIDE}:DEPARTURE_TO_FIRST_SPOT`,
        message: 'スポット1の最寄駅が未設定のため、最寄駅を使わないルートで計算しました。',
      });
      expect(segmentKeys).not.toContain(`${PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION}:DEPARTURE_TO_FIRST_SPOT`);
      // 最寄駅が両方とも無い区間は、これまでどおり長距離徒歩メッセージを出す
      expect(segmentKeys).toContain(`${PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION}:SPOT_spot-1_TO_DESTINATION`);
    });

    it('到着側だけに最寄駅があるときは、出発側の名前で警告を出す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.destination.nearestStation = createStation('dest-station');

      const result = await executePlanning(params);

      expect(result.messages).toContainEqual({
        level: 'WARNING',
        segmentKey: `${PLANNING_MESSAGE_SEGMENT.NEAREST_STATION_ONE_SIDE}:SPOT_spot-1_TO_DESTINATION`,
        message: 'スポット1の最寄駅が未設定のため、最寄駅を使わないルートで計算しました。',
      });
    });
  });
});
