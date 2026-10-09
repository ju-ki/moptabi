import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import {
  buildPreferredSelections,
  collectSavedTransportMethodIds,
  executePlanning,
  type PlanningParams,
  type PlanningResult,
  type RouteInfo,
} from '@/lib/planning';

import {
  mockGetRoute,
  createBaseParams,
  createRouteResult,
  createStation,
  createTwoSpotParams,
  setupDeterministicRouteMock,
} from './fixtures';

/**
 * 前回のプランニング結果を作る（buildPreferredSelections は routes しか見ない）。
 */
function createPreviousResult(routes: RouteInfo[]): PlanningResult {
  const params = createBaseParams();
  return {
    routes,
    totalDistance: 0,
    totalDuration: 0,
    departureTime: '09:00',
    arrivalTime: '11:00',
    isOverTime: false,
    messages: [],
    updatedSpots: params.spots,
    updatedDeparture: params.departure,
    updatedDestination: params.destination,
  };
}

function createRoute(
  fromSpotId: string,
  toSpotId: string,
  transportMethodId: number,
  alternativeIds: number[],
): RouteInfo {
  return {
    id: `route-${fromSpotId}-to-${toSpotId}`,
    fromSpotId,
    toSpotId,
    fromType: fromSpotId === 'departure' ? 'DEPARTURE' : 'SPOT',
    toType: toSpotId === 'destination' ? 'DESTINATION' : 'SPOT',
    routeType: 'SPOT_TO_SPOT',
    transportMethod: 'WALKING',
    transportMethodId,
    distance: 1000,
    duration: 10,
    alternativeRoutes: alternativeIds.map((id) => ({
      transportMethodId: id,
      transportMethod: 'WALKING',
      duration: 10,
      distance: 1000,
    })),
  };
}

/**
 * プレビューの候補ボタンでの切り替え（ストアの switchAlternativeRoute）と同じく、
 * 前回結果の区間の手段とノードの手段を書き換える。
 */
function switchRoute(params: PlanningParams, result: PlanningResult, routeIndex: number, transportMethodId: number) {
  const routes = result.routes.map((route, index) => (index === routeIndex ? { ...route, transportMethodId } : route));
  const previousResult = { ...result, routes };
  const departure = { ...result.updatedDeparture };
  const spots = result.updatedSpots.map((spot) => ({ ...spot }));
  const route = routes[routeIndex];
  if (route.fromType === 'DEPARTURE') {
    departure.transportMethodId = transportMethodId;
  } else {
    const spot = spots.find((target) => target.id === route.fromSpotId);
    if (spot) spot.transportMethodId = transportMethodId;
  }
  const nextParams: PlanningParams = { ...params, departure, spots };
  const preferred = buildPreferredSelections({
    spots,
    departure,
    destination: result.updatedDestination,
    previousResult,
    transportMethodIds: params.transportMethodIds,
  });
  return { ...nextParams, ...preferred };
}

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

  describe('最寄駅経由と他の手段の切り替え（B1）', () => {
    function createStationParams(): PlanningParams {
      const params = createBaseParams();
      params.transportMethodIds = [1, 2, 3];
      params.departure.nearestStation = createStation('dep-station', { scheduledDepartureTimes: ['09:20'] });
      params.spots[0].nearestStation = createStation('spot-station');
      return params;
    }

    it('T2: 優先手段が車でも、候補に最寄駅経由が残り、所要時間は優先手段なしの計算と同じになる', async () => {
      setupDeterministicRouteMock();
      const withoutPreferred = await executePlanning(createStationParams());

      const params = createStationParams();
      params.preferredTransportMethodIds = { DEPARTURE_TO_FIRST_SPOT: 3 };
      const result = await executePlanning(params);
      const route = result.routes[0];

      expect(withoutPreferred.routes[0].transportMethodId).toBe(4);
      // 10分(徒歩) + 10分(待ち 09:10-09:20) + 10分(乗車) + 10分(徒歩)
      expect(withoutPreferred.routes[0].duration).toBe(40);
      expect(route.transportMethodId).toBe(3);
      expect(result.updatedDeparture.transportMethodId).toBe(3);
      const stationRoute = route.alternativeRoutes.find((alt) => alt.transportMethodId === 4);
      expect(stationRoute?.duration).toBe(40);
    });

    it('T1: 最寄駅経由 → 車に切り替えて再プランニングしても最寄駅経由を選び直せる', async () => {
      setupDeterministicRouteMock();
      const params = createStationParams();
      const first = await executePlanning(params);
      expect(first.routes[0].transportMethodId).toBe(4);

      const toCarParams = switchRoute(params, first, 0, 3);
      expect(toCarParams.preferredTransportMethodIds?.DEPARTURE_TO_FIRST_SPOT).toBe(3);
      const second = await executePlanning(toCarParams);
      expect(second.routes[0].transportMethodId).toBe(3);
      expect(second.routes[0].alternativeRoutes.map((alt) => alt.transportMethodId)).toContain(4);

      const backParams = switchRoute(toCarParams, second, 0, 4);
      expect(backParams.preferredTransportMethodIds?.DEPARTURE_TO_FIRST_SPOT).toBe(4);
      const third = await executePlanning(backParams);
      expect(third.routes[0].transportMethodId).toBe(4);
      expect(third.routes[0].duration).toBe(first.routes[0].duration);
      expect(third.updatedDeparture.travelTime).toBe(first.updatedDeparture.travelTime);
    });
  });

  describe('プランの移動手段から外した手段（B4）', () => {
    it('T7: 移動手段が徒歩のみのとき、前回の車は採用されず車のルートも取得しない', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.preferredTransportMethodIds = { DEPARTURE_TO_FIRST_SPOT: 3 };

      const result = await executePlanning(params);

      expect(result.routes[0].transportMethodId).toBe(1);
      expect(result.routes[0].alternativeRoutes.map((alt) => alt.transportMethodId)).not.toContain(3);
      expect(mockGetRoute).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'DRIVING');
    });
  });

  describe('buildPreferredSelections: 前回結果からの優先手段の組み立て', () => {
    it('前回の手段が0のときは優先手段を作らない', () => {
      const params = createBaseParams();
      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 0, [1, 2, 3]),
          createRoute('spot-1', 'destination', 1, [1, 2, 3]),
        ]),
        transportMethodIds: [1, 2, 3],
      });

      expect(result.preferredTransportMethodIds).toEqual({ 'SPOT_spot-1_TO_DESTINATION': 1 });
      expect(result.preferredDepartureTimes).toEqual({});
    });

    it('前回の手段がプランの移動手段に含まれないときは優先手段を作らない（B4）', () => {
      const params = createBaseParams();
      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 3, [1, 2, 3]),
          createRoute('spot-1', 'destination', 2, [1, 2, 3]),
        ]),
        transportMethodIds: [1, 2],
      });

      expect(result.preferredTransportMethodIds).toEqual({ 'SPOT_spot-1_TO_DESTINATION': 2 });
    });

    it('前回が最寄駅経由で両端に最寄駅があるときは、手段を引き継ぐ。保存済みプラン（候補が未設定）なら発車時間も引き継ぐ', () => {
      const params = createBaseParams();
      params.departure.nearestStation = createStation('dep-station', {
        scheduledDepartureTime: '09:20',
        scheduledDepartureTimes: undefined,
      });
      params.spots[0].nearestStation = createStation('spot-station');
      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 4, [4, 3, 2, 1]),
          createRoute('spot-1', 'destination', 1, [1, 2, 3]),
        ]),
        transportMethodIds: [1, 2, 3],
      });

      expect(result.preferredTransportMethodIds.DEPARTURE_TO_FIRST_SPOT).toBe(4);
      expect(result.preferredDepartureTimes).toEqual({ DEPARTURE_TO_FIRST_SPOT: '09:20' });
    });

    it('候補が空配列のときは、自動設定された発車時間を引き継がない', () => {
      const params = createBaseParams();
      // 候補未入力でプランニングすると、駅到着+1分の時刻が scheduledDepartureTime に書き戻される
      params.departure.nearestStation = createStation('dep-station', {
        scheduledDepartureTime: '09:11',
        scheduledDepartureTimes: [],
      });
      params.spots[0].nearestStation = createStation('spot-station');
      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 4, [4, 3, 2, 1]),
          createRoute('spot-1', 'destination', 1, [1, 2, 3]),
        ]),
        transportMethodIds: [1, 2, 3],
      });

      expect(result.preferredTransportMethodIds.DEPARTURE_TO_FIRST_SPOT).toBe(4);
      expect(result.preferredDepartureTimes).toEqual({});
    });

    it('候補未入力で再プランニングしたとき、発車時間は新しい駅到着時刻に合わせて設定し直す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.departure.nearestStation = createStation('dep-station');
      params.spots[0].nearestStation = createStation('spot-station');
      const first = await executePlanning(params);
      // 09:00 + 徒歩 10分 → 駅到着 09:10、発車 09:11
      expect(first.updatedDeparture.nearestStation?.scheduledDepartureTime).toBe('09:11');

      const replanParams = switchRoute(params, first, 0, 4);
      replanParams.departure = { ...replanParams.departure, time: '08:30' };
      const second = await executePlanning(replanParams);

      // 前回の 09:11 に固定されず、駅到着 08:40 の1分後になる
      expect(second.updatedDeparture.nearestStation?.scheduledDepartureTime).toBe('08:41');
      expect(second.updatedDeparture.nearestStation?.waitingTime).toBe(1);
    });

    it('前回が最寄駅経由でも、片側の最寄駅が外されたときは優先手段を作らない', () => {
      const params = createBaseParams();
      params.departure.nearestStation = createStation('dep-station', { scheduledDepartureTime: '09:20' });
      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 4, [4, 3, 2, 1]),
          createRoute('spot-1', 'destination', 1, [1, 2, 3]),
        ]),
        transportMethodIds: [1, 2, 3],
      });

      expect(result.preferredTransportMethodIds.DEPARTURE_TO_FIRST_SPOT).toBeUndefined();
      expect(result.preferredDepartureTimes).toEqual({});
    });

    it('T3: 前回は最寄駅経由の候補が無く、今回は両端に最寄駅があるときは優先手段を作らない（B6）', () => {
      const params = createBaseParams();
      params.departure.nearestStation = createStation('dep-station');
      params.spots[0].nearestStation = createStation('spot-station');
      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 3, [3, 2, 1]),
          createRoute('spot-1', 'destination', 1, [1, 2, 3]),
        ]),
        transportMethodIds: [1, 2, 3],
      });

      expect(result.preferredTransportMethodIds.DEPARTURE_TO_FIRST_SPOT).toBeUndefined();
    });

    it('最寄駅経由の候補があった区間で別の手段を選んでいたときは、その手段を優先する', () => {
      const params = createBaseParams();
      params.departure.nearestStation = createStation('dep-station');
      params.spots[0].nearestStation = createStation('spot-station');
      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 3, [4, 3, 2, 1]),
          createRoute('spot-1', 'destination', 1, [1, 2, 3]),
        ]),
        transportMethodIds: [1, 2, 3],
      });

      expect(result.preferredTransportMethodIds.DEPARTURE_TO_FIRST_SPOT).toBe(3);
    });

    it('T6: 並び替えで区間の組み合わせが変わったときは優先手段を引き継がない（B7）', () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1, 2, 3];
      const [spot1, spot2] = params.spots;
      const reordered = [
        { ...spot2, order: 1 },
        { ...spot1, order: 2 },
      ];
      const result = buildPreferredSelections({
        spots: reordered,
        departure: params.departure,
        destination: params.destination,
        previousResult: createPreviousResult([
          createRoute('departure', 'spot-1', 2, [3, 2, 1]),
          createRoute('spot-1', 'spot-2', 1, [3, 2, 1]),
          createRoute('spot-2', 'destination', 3, [3, 2, 1]),
        ]),
        transportMethodIds: [1, 2, 3],
      });

      // spot-2 → spot-1 は前回の spot-1 → spot-2 とは別の区間
      expect(result.preferredTransportMethodIds).toEqual({});
    });

    it('前回結果が無いときは、ノードの移動手段から優先手段を作る', () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1, 2, 3];
      params.departure.transportMethodId = 2;
      params.spots[0].transportMethodId = 0;
      params.spots[1].transportMethodId = 4;
      params.spots[1].nearestStation = createStation('spot2-station', {
        scheduledDepartureTime: '12:10',
        scheduledDepartureTimes: undefined,
      });
      params.destination.nearestStation = createStation('dest-station');

      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        transportMethodIds: [1, 2, 3],
      });

      expect(result.preferredTransportMethodIds).toEqual({
        DEPARTURE_TO_FIRST_SPOT: 2,
        'SPOT_spot-2_TO_DESTINATION': 4,
      });
      expect(result.preferredDepartureTimes).toEqual({ 'SPOT_spot-2_TO_DESTINATION': '12:10' });
    });
  });

  describe('collectSavedTransportMethodIds: 保存済みプランの移動手段からチェック状態を復元する', () => {
    it('出発地と各スポットの移動手段を重複なく昇順で返す', () => {
      const params = createTwoSpotParams(30);
      params.departure.transportMethodId = 3;
      params.spots[0].transportMethodId = 1;
      params.spots[1].transportMethodId = 3;

      expect(collectSavedTransportMethodIds({ departure: params.departure, spots: params.spots })).toEqual([1, 3]);
    });

    it('電車/バス（4）と指定なし（0）はチェックボックスが無いため含めない', () => {
      const params = createTwoSpotParams(30);
      params.departure.transportMethodId = 4;
      params.spots[0].transportMethodId = 0;
      params.spots[1].transportMethodId = 2;

      expect(collectSavedTransportMethodIds({ departure: params.departure, spots: params.spots })).toEqual([2]);
    });

    it('全区間が電車/バスのときは空配列を返す', () => {
      const params = createTwoSpotParams(30);
      params.departure.transportMethodId = 4;
      params.spots[0].transportMethodId = 4;
      params.spots[1].transportMethodId = 4;

      expect(collectSavedTransportMethodIds({ departure: params.departure, spots: params.spots })).toEqual([]);
    });

    it('復元した手段を渡すと、保存済みプランの車の区間は車を優先手段にする（動作確認 9-2）', () => {
      const params = createTwoSpotParams(30);
      params.departure.transportMethodId = 3;
      params.spots[0].transportMethodId = 3;
      params.spots[1].transportMethodId = 3;

      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        transportMethodIds: collectSavedTransportMethodIds({ departure: params.departure, spots: params.spots }),
      });

      expect(result.preferredTransportMethodIds).toEqual({
        DEPARTURE_TO_FIRST_SPOT: 3,
        'SPOT_spot-1_TO_spot-2': 3,
        'SPOT_spot-2_TO_DESTINATION': 3,
      });
    });

    it('復元した手段を渡すと、両端に最寄駅がある区間でも保存時の車を優先手段にする（動作確認の追記）', () => {
      const params = createBaseParams();
      params.departure.transportMethodId = 3;
      params.departure.nearestStation = createStation('dep-station', {
        scheduledDepartureTime: '09:20',
        scheduledDepartureTimes: undefined,
      });
      params.spots[0].transportMethodId = 3;
      params.spots[0].nearestStation = createStation('spot-station');
      params.destination.nearestStation = createStation('dest-station');

      const result = buildPreferredSelections({
        spots: params.spots,
        departure: params.departure,
        destination: params.destination,
        transportMethodIds: collectSavedTransportMethodIds({ departure: params.departure, spots: params.spots }),
      });

      expect(result.preferredTransportMethodIds).toEqual({
        DEPARTURE_TO_FIRST_SPOT: 3,
        'SPOT_spot-1_TO_DESTINATION': 3,
      });
      expect(result.preferredDepartureTimes).toEqual({});
    });
  });
});
