import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import {
  determinePlanningMode,
  executePlanning,
  getPlanningMessagePriority,
  getOptimalRouteWithAlternatives,
  parseDurationTextToMinutes,
  pushLongWalkMessage,
  selectDepartureCandidate,
  sortPlanningMessages,
  timeToMinutes,
  type PlanningParams,
} from '@/lib/planning';
import { getRoute } from '@/lib/plan';
import { PLANNING_MESSAGE_SEGMENT } from '@/data/constants';

const mockGetRoute = getRoute as unknown as ReturnType<typeof vi.fn>;

function createBaseLocation(locationType: 'DEPARTURE' | 'DESTINATION') {
  return {
    name: locationType === 'DEPARTURE' ? '出発地' : '目的地',
    latitude: 35.681236,
    longitude: 139.767125,
    label: null,
    isDefault: false,
    locationType,
    usageCount: 0,
    planId: null,
    planName: null,
    userLocationId: null,
    planLocationId: null,
    time: locationType === 'DEPARTURE' ? '09:00' : '11:00',
    transports: {
      transportMethod: 1,
      name: 'WALKING' as const,
      travelTime: '10分',
      fromType: locationType,
      toType: 'SPOT' as const,
    },
  };
}

function createBaseParams(): PlanningParams {
  return {
    date: '2026-04-28',
    departure: createBaseLocation('DEPARTURE') as PlanningParams['departure'],
    destination: createBaseLocation('DESTINATION') as PlanningParams['destination'],
    spots: [
      {
        id: 'spot-1',
        clientRef: 'spot-1',
        location: { id: 'spot-1', name: 'スポット1', lat: 35.6895, lng: 139.6917 },
        stayStart: '10:00',
        stayEnd: '11:00',
        stayDuration: 60,
        memo: '',
        transports: {
          transportMethod: 1,
          name: 'WALKING',
          travelTime: '15分',
          fromType: 'SPOT',
          toType: 'DESTINATION',
        },
        order: 1,
      },
    ],
    transportMethodIds: [1, 2, 3],
  };
}

function createRouteResult(travelMode: 'WALKING' | 'DRIVING' | 'BICYCLING', duration: string, distance: string) {
  return {
    path: [
      { lat: 35.681236, lng: 139.767125 },
      { lat: 35.6895, lng: 139.6917 },
    ],
    distance,
    duration,
    travelMode,
  };
}

type TransportPattern = 'SINGLE' | 'MULTI';
type NearestStationPattern = 'WITHOUT_STATION' | 'WITH_STATION';
type CandidatePattern = 'EMPTY' | 'VALID' | 'PAST';
type PlanningTypePattern = 'BOTH' | 'FORWARD' | 'BACKWARD';

type PlanningMatrixCase = {
  id: string;
  transportPattern: TransportPattern;
  nearestStationPattern: NearestStationPattern;
  candidatePattern: CandidatePattern;
  planningTypePattern: PlanningTypePattern;
};

const TRANSPORT_PATTERNS: TransportPattern[] = ['SINGLE', 'MULTI']; //移動手段が単数か複数か
const NEAREST_STATION_PATTERNS: NearestStationPattern[] = ['WITHOUT_STATION', 'WITH_STATION']; //最寄駅の有無
const CANDIDATE_PATTERNS: CandidatePattern[] = ['EMPTY', 'VALID', 'PAST']; //最寄駅の発車時間の候補のパターン
const PLANNING_TYPE_PATTERNS: PlanningTypePattern[] = ['BOTH', 'FORWARD', 'BACKWARD']; //プランニングにおけるアルゴリズムのタイプ

const PLANNING_MATRIX_CASES: PlanningMatrixCase[] = PLANNING_TYPE_PATTERNS.flatMap((planningTypePattern) =>
  TRANSPORT_PATTERNS.flatMap((transportPattern) =>
    NEAREST_STATION_PATTERNS.flatMap((nearestStationPattern) =>
      CANDIDATE_PATTERNS.map((candidatePattern) => ({
        id: `${planningTypePattern}_${transportPattern}_${nearestStationPattern}_${candidatePattern}`,
        transportPattern,
        nearestStationPattern,
        candidatePattern,
        planningTypePattern,
      })),
    ),
  ),
);

function createCandidateTimes(pattern: CandidatePattern): string[] {
  if (pattern === 'EMPTY') return [];
  if (pattern === 'VALID') return ['09:20', '09:35', '09:50'];
  return ['08:20', '08:40', '09:00'];
}

function createPlanningParamsFromMatrix(matrixCase: PlanningMatrixCase, stayDurationMinutes: number): PlanningParams {
  const params = createBaseParams();
  params.spots[0].stayDuration = stayDurationMinutes;

  if (matrixCase.transportPattern === 'SINGLE') {
    params.transportMethodIds = [1];
  } else {
    params.transportMethodIds = [1, 2, 3];
  }

  if (matrixCase.planningTypePattern === 'BOTH') {
    params.departure.time = '09:00';
    params.destination.time = '12:00';
  }

  if (matrixCase.planningTypePattern === 'FORWARD') {
    params.departure.time = '09:00';
    params.destination.time = undefined;
  }

  if (matrixCase.planningTypePattern === 'BACKWARD') {
    params.departure.time = undefined;
    params.destination.time = '12:00';
  }

  if (matrixCase.nearestStationPattern === 'WITH_STATION') {
    const candidates = createCandidateTimes(matrixCase.candidatePattern);
    params.departure.nearestStation = {
      spotId: 'departure',
      placeId: 'dep-station',
      name: '東京駅',
      walkingTime: 10,
      latitude: 35.681236,
      longitude: 139.767125,
      transitTime: 10,
      scheduledDepartureTimes: candidates,
      stationType: 'TRAIN',
    };

    params.spots[0].nearestStation = {
      placeId: 'spot-station',
      name: '新宿駅',
      stationType: 'TRAIN',
      walkingTime: 10,
      latitude: 35.6895,
      longitude: 139.7004,
      scheduledDepartureTimes: candidates,
      transitTime: 10,
    };

    params.destination.nearestStation = {
      spotId: 'destination',
      placeId: 'dest-station',
      name: '品川駅',
      walkingTime: 8,
      latitude: 35.6284,
      longitude: 139.7387,
      transitTime: 12,
      scheduledDepartureTimes: candidates,
      stationType: 'TRAIN',
    };
  }

  return params;
}

function createTwoSpotParams(firstSpotStayDurationMinutes: number): PlanningParams {
  const params = createBaseParams();
  params.departure.time = '09:00';
  params.destination.time = '13:00';
  params.transportMethodIds = [1];
  params.spots = [
    {
      id: 'spot-1',
      clientRef: 'spot-1',
      location: { id: 'spot-1', name: 'スポット1', lat: 35.6895, lng: 139.6917 },
      stayStart: '10:00',
      stayEnd: '11:00',
      stayDuration: firstSpotStayDurationMinutes,
      memo: '',
      transports: {
        transportMethod: 1,
        name: 'WALKING',
        travelTime: '15分',
        fromType: 'SPOT',
        toType: 'SPOT',
      },
      order: 1,
    },
    {
      id: 'spot-2',
      clientRef: 'spot-2',
      location: { id: 'spot-2', name: 'スポット2', lat: 35.6982, lng: 139.7731 },
      stayStart: '11:00',
      stayEnd: '12:00',
      stayDuration: 60,
      memo: '',
      transports: {
        transportMethod: 1,
        name: 'WALKING',
        travelTime: '15分',
        fromType: 'SPOT',
        toType: 'DESTINATION',
      },
      order: 2,
    },
  ];

  return params;
}

function setupDeterministicRouteMock(): void {
  mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
    if (mode === 'WALKING') return createRouteResult('WALKING', '15分', '1.5 km');
    if (mode === 'BICYCLING') return createRouteResult('BICYCLING', '10分', '1.5 km');
    if (mode === 'DRIVING') return createRouteResult('DRIVING', '8分', '2.0 km');
    throw new Error(`unexpected mode: ${mode}`);
  });
}

describe('planning.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('出発地と目的地の入力パターン', () => {
    it('出発時間と到着時間が両方入力済みならBOTHを返す', () => {
      expect(determinePlanningMode('09:00', '18:00')).toBe('BOTH');
    });

    it('出発時間のみ入力済みならFORWARDを返す', () => {
      expect(determinePlanningMode('09:00', '')).toBe('FORWARD');
    });

    it('到着時間のみ入力済みならBACKWARDを返す', () => {
      expect(determinePlanningMode('', '18:00')).toBe('BACKWARD');
    });

    it('出発時間と到着時間が両方未入力ならエラーにする', () => {
      expect(() => determinePlanningMode('', '')).toThrow('出発時間または到着時間のどちらかを入力してください');
    });
  });

  describe('発車時間の候補選択ルール', () => {
    it('最寄駅到着+1分以降の候補がある場合は最も早い候補を採用する', () => {
      const selected = selectDepartureCandidate(630, ['10:20', '10:50', '11:00']);

      expect(selected.selectedTime).toBe('10:50');
      expect(selected.level).toBeUndefined();
      expect(selected.message).toBeUndefined();
    });

    it('発車時間候補が未入力なら最寄駅到着+1分を自動採用する', () => {
      const selected = selectDepartureCandidate(630, []);

      expect(selected.selectedTime).toBe('10:31');
      expect(selected.level).toBe('WARNING');
      expect(selected.message).toBe('発車時間が未入力のため、最寄駅到着の1分後に設定しました。');
    });

    it('候補がすべて最寄駅到着+1分より前なら最寄駅到着+1分へ補正する', () => {
      const selected = selectDepartureCandidate(630, ['09:50', '10:00', '10:30']);

      expect(selected.selectedTime).toBe('10:31');
      expect(selected.level).toBe('WARNING');
      expect(selected.message).toBe(
        '入力した発車時間が最寄駅到着時間より前になるため、発車時間を調整しました。発車時間の見直しまたはスポットの見直しを行ってください。',
      );
    });

    it('[RED] 有効な発車候補がある場合は区間メッセージを生成しない', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: ['09:20', '09:35', '09:50'],
        stationType: 'TRAIN',
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

      const result = await executePlanning(params);

      expect(
        result.messages.some((message) =>
          message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY),
        ),
      ).toBe(false);
      expect(
        result.messages.some((message) =>
          message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED),
        ),
      ).toBe(false);
    });

    it('[RED] 発車候補未入力時は固定segmentKey+区間キーでメッセージを生成する', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: [],
        stationType: 'TRAIN',
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
        scheduledDepartureTimes: [],
        transitTime: 10,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

      const result = await executePlanning(params);
      const candidateMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY),
      );

      expect(candidateMessage).toBeDefined();
      expect(candidateMessage?.segmentKey).toBe(
        `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY}:DEPARTURE_TO_FIRST_SPOT`,
      );
    });

    it('[RED] 発車候補が全て過去時は固定segmentKey+区間キーでメッセージを生成する', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: ['08:00', '08:20', '08:40'],
        stationType: 'TRAIN',
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

      const result = await executePlanning(params);
      const candidateMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED),
      );

      expect(candidateMessage).toBeDefined();
      expect(candidateMessage?.segmentKey).toBe(
        `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED}:DEPARTURE_TO_FIRST_SPOT`,
      );
    });
  });

  describe('移動手段の複数選択時のルール', () => {
    it('複数の移動手段が取得できる場合は優先度の高い手段を採用する', async () => {
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', '15分', '1.2 km');
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', '8分', '1.2 km');
        if (mode === 'DRIVING') return createRouteResult('DRIVING', '5分', '1.5 km');
        throw new Error('unexpected');
      });

      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [1, 2, 3],
      );

      expect(result.selectedRoute.transportMethodId).toBe(3);
      expect(result.alternativeRoutes).toHaveLength(3);
    });

    it('優先手段が失敗した場合は取得できた次の手段を採用する', async () => {
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', '15分', '1.2 km');
        if (mode === 'BICYCLING') throw new Error('bicycle failed');
        if (mode === 'DRIVING') throw new Error('car failed');
        throw new Error('unexpected');
      });

      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [1, 2, 3],
      );

      expect(result.selectedRoute.transportMethodId).toBe(1);
      expect(result.failedRoutes).toHaveLength(2);
      expect(result.isFallbackToWalking).toBe(false);
    });

    it('徒歩以外がすべて失敗した場合は徒歩ルートへフォールバックする', async () => {
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'DRIVING') throw new Error('car failed');
        if (mode === 'BICYCLING') throw new Error('bicycle failed');
        if (mode === 'WALKING') return createRouteResult('WALKING', '20分', '1.4 km');
        throw new Error('unexpected');
      });

      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [2, 3],
      );

      expect(result.selectedRoute.transportMethodId).toBe(1);
      expect(result.isFallbackToWalking).toBe(true);
      expect(result.failedRoutes).toHaveLength(2);
    });

    it('優先移動手段IDが指定されている場合は、取得可能なら優先IDを採用する', async () => {
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', '15分', '1.2 km');
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', '8分', '1.2 km');
        if (mode === 'DRIVING') return createRouteResult('DRIVING', '5分', '1.5 km');
        throw new Error('unexpected');
      });

      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [1, 2, 3],
        1.5,
        2,
      );

      expect(result.selectedRoute.transportMethodId).toBe(2);
    });

    it('【異常系】優先移動手段IDが指定されているが、transportMethodIdsに含まれていない場合は移動手段は採用されない', async () => {
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', '15分', '1.2 km');
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', '8分', '1.2 km');
        if (mode === 'DRIVING') return createRouteResult('DRIVING', '5分', '1.5 km');
        throw new Error('unexpected');
      });

      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [1], // 利用可能な交通手段に2が含まれていない
        1.5,
        2,
      );

      // デフォルト移動手段である1が採用される
      expect(result.selectedRoute.transportMethodId).toBe(1);
    });
  });

  describe('プランニングのアウトプット結果', () => {
    it('プランニング結果としてルート情報、出発時刻、到着時刻、メッセージ、到着超過判定を返す', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '11:00';

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

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

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

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
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
        placeId: 'spot-station',
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

      const result = await executePlanning(params);

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0].level).toBe('WARNING');
      expect(result.messages[0].message).toContain('最寄駅到着の1分後');
      expect(result.routes.some((route) => route.useNearestStation)).toBe(true);
    });

    it('[RED] 出発地の最寄駅計算結果(発車時刻/待機時間/乗車時間)を返す', async () => {
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
        walkingTime: 8,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

      const result = await executePlanning(params);
      const updatedDeparture = (result as any).updatedDeparture;

      expect(updatedDeparture).toBeDefined();
      expect(updatedDeparture.nearestStation?.scheduledDepartureTime).toBeDefined();
      expect(updatedDeparture.nearestStation?.waitingTime).toBeTypeOf('number');
      expect(updatedDeparture.nearestStation?.transitTime).toBe(12);
    });

    it('[RED] 目的地の最寄駅計算結果(発車時刻/待機時間/乗車時間)を返す', async () => {
      const params = createTwoSpotParams(30);
      params.transportMethodIds = [1];
      params.spots[1].nearestStation = {
        placeId: 'spot2-station',
        name: '品川駅',
        stationType: 'TRAIN',
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
        transitTime: 18,
        scheduledDepartureTimes: ['11:00', '11:15', '11:30'],
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '1.2 km'));

      const result = await executePlanning(params);
      const updatedDestination = (result as any).updatedDestination;

      expect(updatedDestination).toBeDefined();
      expect(updatedDestination.nearestStation?.scheduledDepartureTime).toBeDefined();
      expect(updatedDestination.nearestStation?.waitingTime).toBeTypeOf('number');
      expect(updatedDestination.nearestStation?.transitTime).toBe(18);
    });

    it('再プランニング時に区間優先移動手段が指定されている場合、最寄駅より指定手段を優先採用する', async () => {
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
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', '15分', '1.2 km');
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', '8分', '1.2 km');
        if (mode === 'DRIVING') return createRouteResult('DRIVING', '5分', '1.5 km');
        throw new Error('unexpected');
      });

      const result = await executePlanning(params);
      const departureToSpotRoute = result.routes.find(
        (route) => route.fromType === 'DEPARTURE' && route.toType === 'SPOT',
      );

      expect(departureToSpotRoute).toBeDefined();
      expect(departureToSpotRoute?.transportMethodId).toBe(3);
      expect(departureToSpotRoute?.routeType).toBe('DEPARTURE_TO_SPOT');
    });

    it.each(PLANNING_MATRIX_CASES)(
      '[RED][%s] 総移動時間は選択ルートduration合計（秒）と一致する',
      async (matrixCase) => {
        setupDeterministicRouteMock();
        const params = createPlanningParamsFromMatrix(matrixCase, 60);

        const result = await executePlanning(params);

        const expectedDurationSeconds = result.routes.reduce((sum, route) => sum + route.duration, 0);
        expect(result.totalDuration).toBe(expectedDurationSeconds);
      },
    );

    it.each(PLANNING_MATRIX_CASES)(
      '[RED][%s] 総移動距離は選択ルートdistance合計（m）と一致する',
      async (matrixCase) => {
        setupDeterministicRouteMock();
        const params = createPlanningParamsFromMatrix(matrixCase, 60);

        const result = await executePlanning(params);

        const expectedDistanceMeters = result.routes.reduce((sum, route) => sum + route.distance, 0);
        expect(result.totalDistance).toBe(expectedDistanceMeters);
        expect(result.totalDistance).toBeGreaterThan(0);
      },
    );
  });

  describe('余裕時間に応じた提案メッセージ', () => {
    it('[RED] 余裕時間が30分以上のとき滞在時間延長の提案を返す', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_SINGLE_WITHOUT_STATION_VALID',
          planningTypePattern: 'BOTH',
          transportPattern: 'SINGLE',
          nearestStationPattern: 'WITHOUT_STATION',
          candidatePattern: 'VALID',
        },
        30,
      );
      params.destination.time = '10:30';

      const result = await executePlanning(params);

      expect((result as unknown as { extraTimeMinutes?: number }).extraTimeMinutes).toBeGreaterThanOrEqual(30);
      expect(result.messages.some((message) => message.message.includes('お気に入りのスポット'))).toBe(true);
    });

    it('[RED] 余裕時間が60分以上のときゆとりある観光の提案を返す', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_MULTI_WITHOUT_STATION_VALID',
          planningTypePattern: 'BOTH',
          transportPattern: 'MULTI',
          nearestStationPattern: 'WITHOUT_STATION',
          candidatePattern: 'VALID',
        },
        30,
      );
      params.destination.time = '11:00';

      const result = await executePlanning(params);

      expect((result as unknown as { extraTimeMinutes?: number }).extraTimeMinutes).toBeGreaterThanOrEqual(60);
      expect(result.messages.some((message) => message.message.includes('各スポットで約'))).toBe(true);
    });

    it('[RED] 余裕時間60分以上の提案は「余力時間/スポット数」の分数で表示される', async () => {
      setupDeterministicRouteMock();
      const params = createTwoSpotParams(30);
      params.destination.time = '12:40';
      params.transportMethodIds = [1];

      const result = await executePlanning(params);

      expect(result.extraTimeMinutes).toBeGreaterThanOrEqual(60);
      const expectedPerSpot = Math.floor((result.extraTimeMinutes ?? 0) / params.spots.length);
      expect(result.extraTimeMessage).toBe(`各スポットで約${expectedPerSpot}分ずつ長く滞在できます`);
    });

    it('[RED] 余裕時間が90分以上のときスポット追加提案を返す', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_MULTI_WITH_STATION_EMPTY',
          planningTypePattern: 'BOTH',
          transportPattern: 'MULTI',
          nearestStationPattern: 'WITH_STATION',
          candidatePattern: 'EMPTY',
        },
        30,
      );
      params.destination.time = '14:00';

      const result = await executePlanning(params);

      expect((result as unknown as { extraTimeMinutes?: number }).extraTimeMinutes).toBeGreaterThanOrEqual(90);
      expect(
        result.messages.some((message) =>
          message.message.includes('新しいスポットを追加して、より充実した旅程にしませんか'),
        ),
      ).toBe(true);
    });

    it('余裕時間提案は extraTimeMessage にも格納される', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_MULTI_WITH_STATION_EMPTY',
          planningTypePattern: 'BOTH',
          transportPattern: 'MULTI',
          nearestStationPattern: 'WITH_STATION',
          candidatePattern: 'EMPTY',
        },
        30,
      );
      params.destination.time = '14:00';

      const result = await executePlanning(params);

      expect(result.extraTimeMinutes).toBeGreaterThanOrEqual(90);
      expect(result.extraTimeMessage).toBe('新しいスポットを追加して、より充実した旅程にしませんか');
    });
  });

  describe('メッセージ優先度', () => {
    it('[RED] 到着時間超過メッセージは徒歩長距離メッセージより先に並ぶ', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '09:20';

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '15分', '2.0 km'));

      const result = await executePlanning(params);
      const overTimeIndex = result.messages.findIndex(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );
      const longWalkIndex = result.messages.findIndex((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION),
      );

      expect(overTimeIndex).toBeGreaterThanOrEqual(0);
      expect(longWalkIndex).toBeGreaterThanOrEqual(0);
      expect(overTimeIndex).toBeLessThan(longWalkIndex);
    });

    it('[RED] 優先順位1-7の全パターンでソートされる', () => {
      const sorted = sortPlanningMessages([
        {
          level: 'INFO',
          segmentKey: PLANNING_MESSAGE_SEGMENT.EXTRA_TIME,
          message: 'お気に入りのスポットでもう少しゆっくり過ごしてみては？',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED}:SPOT_A_TO_B`,
          message:
            '入力した発車時間が最寄駅到着時間より前になるため、発車時間を調整しました。発車時間の見直しまたはスポットの見直しを行ってください。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY}:SPOT_A_TO_B`,
          message: '発車時間が未入力のため、最寄駅到着の1分後に設定しました。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.ROUTE_FETCH_FAILED}:SPOT_A_TO_B`,
          message: 'ルートが取得できませんでした。スポットの見直しをしてください。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.ROUTE_FALLBACK_WALKING}:SPOT_A_TO_B`,
          message: '車のルートが取得できませんでしたので徒歩のルートを取得しました。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION}:SPOT_A_TO_B`,
          message: '徒歩で0時間45分かかるため,最寄駅を推奨します',
        },
        {
          level: 'WARNING',
          segmentKey: PLANNING_MESSAGE_SEGMENT.OVER_TIME,
          message: 'スポットの見直しをしてみましょう。',
        },
      ]);

      const priorities = sorted.map((message) => getPlanningMessagePriority(message));
      expect(priorities).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  //  経路失敗・長距離徒歩メッセージ
  describe('経路失敗・長距離徒歩メッセージ', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('ルート取得失敗時はROUTE_FETCH_FAILEDメッセージが最優先で表示される', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [2, 3];
      mockGetRoute.mockImplementation(async () => {
        throw new Error('route failed');
      });

      const result = await executePlanning(params);
      expect(result.messages[0].segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.ROUTE_FETCH_FAILED)).toBe(true);
      expect(getPlanningMessagePriority(result.messages[0])).toBe(2); // 2はROUTE_FETCH_FAILEDの優先度
    });

    it('徒歩長距離が発生した場合はLONG_WALK_RECOMMENDATIONメッセージが表示される', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '1時間40分', '2.0 km'));

      const result = await executePlanning(params);
      expect(
        result.messages.some((message) =>
          message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION),
        ),
      ).toBe(true);
    });

    it('ルート取得失敗と徒歩長距離が同時に発生した場合はROUTE_FETCH_FAILEDが優先', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1, 2, 3];
      let routeCallCount = 0;
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        routeCallCount += 1;
        // 1区間目(4回想定: WALKING/BICYCLING/DRIVING/fallback WALKING)は全失敗
        if (routeCallCount <= 4) throw new Error(`${mode} failed`);
        // 2区間目は徒歩のみ成功して長距離徒歩メッセージを発生させる
        if (mode === 'WALKING') return createRouteResult('WALKING', '1時間40分', '2.0 km');
        throw new Error(`${mode} failed`);
      });

      const result = await executePlanning(params);
      const routeFailureMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.ROUTE_FETCH_FAILED),
      );
      const longWalkMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION),
      );

      expect(routeFailureMessage).toBeDefined();
      expect(longWalkMessage).toBeDefined();
      expect(getPlanningMessagePriority(routeFailureMessage!)).toBeLessThan(
        getPlanningMessagePriority(longWalkMessage!),
      );
    });
  });

  describe('ルート取得不可メッセージの生成', () => {
    it('[RED] ルート取得失敗時は設計書の失敗メッセージを返す', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1, 2, 3];

      mockGetRoute.mockImplementation(async (_from, _to, _mode: string) => {
        throw new Error('route failed');
      });

      const result = await executePlanning(params);

      expect(
        result.messages.some(
          (message) => message.message === 'ルートが取得できませんでした。スポットの見直しをしてください。',
        ),
      ).toBe(true);
    });

    it('徒歩長距離メッセージはhh時間mm分形式で返す', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', '1時間40分', '2.0 km'));

      const result = await executePlanning(params);
      const longWalk = result.messages.find((message) => message.message.includes('最寄駅を推奨します'));

      expect(longWalk).toBeDefined();
      expect(longWalk?.message).toContain('徒歩で1時間40分かかるため,最寄駅を推奨します');
    });
  });

  describe('滞在時間の補正', () => {
    it.each(PLANNING_MATRIX_CASES)('[RED][%s] 滞在時間が長いほど到着時刻は後ろ倒しになる', async (matrixCase) => {
      setupDeterministicRouteMock();
      const shortStayParams = createPlanningParamsFromMatrix(matrixCase, 30);
      const longStayParams = createPlanningParamsFromMatrix(matrixCase, 180);

      const shortResult = await executePlanning(shortStayParams);
      const longResult = await executePlanning(longStayParams);

      expect(timeToMinutes(longResult.arrivalTime)).toBeGreaterThan(timeToMinutes(shortResult.arrivalTime));
    });

    it('updatedSpots に滞在開始/終了時刻が反映される', async () => {
      setupDeterministicRouteMock();
      const params = createTwoSpotParams(30);

      const result = await executePlanning(params);

      expect(result.updatedSpots).toBeDefined();
      expect(result.updatedSpots).toHaveLength(2);
      expect(result.updatedSpots?.[0].stayStart).toMatch(/^\d{2}:\d{2}$/);
      expect(result.updatedSpots?.[0].stayEnd).toMatch(/^\d{2}:\d{2}$/);
      expect(result.updatedSpots?.[1].stayStart).toMatch(/^\d{2}:\d{2}$/);
      expect(result.updatedSpots?.[1].stayEnd).toMatch(/^\d{2}:\d{2}$/);
    });

    it('先行スポットの滞在時間が長いほど後続スポットの滞在時刻が後ろにスライドする', async () => {
      setupDeterministicRouteMock();
      const shortStayParams = createTwoSpotParams(30);
      const longStayParams = createTwoSpotParams(180);

      const shortResult = await executePlanning(shortStayParams);
      const longResult = await executePlanning(longStayParams);

      const shortSecondSpot = shortResult.updatedSpots?.find((spot) => spot.id === 'spot-2');
      const longSecondSpot = longResult.updatedSpots?.find((spot) => spot.id === 'spot-2');

      expect(shortSecondSpot).toBeDefined();
      expect(longSecondSpot).toBeDefined();
      expect(timeToMinutes(longSecondSpot!.stayStart)).toBeGreaterThan(timeToMinutes(shortSecondSpot!.stayStart));
      expect(timeToMinutes(longSecondSpot!.stayEnd)).toBeGreaterThan(timeToMinutes(shortSecondSpot!.stayEnd));
    });

    it.each(PLANNING_MATRIX_CASES)(
      '[RED][%s] 到着時間超過時に必要な滞在時間短縮分をメッセージとして返す',
      async (matrixCase) => {
        setupDeterministicRouteMock();
        const params = createPlanningParamsFromMatrix(matrixCase, 240);
        params.destination.time = '09:30';

        const result = await executePlanning(params);

        expect(result.isOverTime).toBe(true);
        expect(
          result.messages.some(
            (message) =>
              message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME &&
              (message.message.includes('滞在時間を') ||
                message.message.includes('各スポットの滞在時間を減らすか他の移動手段を検討してみましょう') ||
                message.message.includes('スポットの見直しをしてみましょう。')),
          ),
        ).toBe(true);
      },
    );

    it('[RED] 到着時間超過が1-30分のときは小提案メッセージを返す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '10:25';

      const result = await executePlanning(params);
      const overTimeMessage = result.messages.find(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );

      expect(result.isOverTime).toBe(true);
      expect(result.overTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(result.overTimeMinutes).toBeLessThanOrEqual(30);
      expect(overTimeMessage?.message).toBe(`滞在時間を${result.overTimeMinutes}分減らしてみましょう。`);
    });

    it('[RED] 到着時間超過が31-60分のときは中提案メッセージを返す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '09:45';

      const result = await executePlanning(params);
      const overTimeMessage = result.messages.find(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );

      expect(result.isOverTime).toBe(true);
      expect(result.overTimeMinutes).toBeGreaterThanOrEqual(31);
      expect(result.overTimeMinutes).toBeLessThanOrEqual(60);
      expect(overTimeMessage?.message).toBe('各スポットの滞在時間を減らすか他の移動手段を検討してみましょう');
    });

    it('[RED] 到着時間超過が61分以上のときは大提案メッセージを返す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '09:15';

      const result = await executePlanning(params);
      const overTimeMessage = result.messages.find(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );

      expect(result.isOverTime).toBe(true);
      expect(result.overTimeMinutes).toBeGreaterThanOrEqual(61);
      expect(overTimeMessage?.message).toBe('スポットの見直しをしてみましょう。');
    });

    it('[RED] 到着時間超過時は arrivalWarning を返し、超過しない場合は null', async () => {
      setupDeterministicRouteMock();

      const overParams = createBaseParams();
      overParams.transportMethodIds = [1];
      overParams.destination.time = '09:45';
      const overResult = await executePlanning(overParams);

      expect(overResult.isOverTime).toBe(true);
      expect(overResult.arrivalWarning).not.toBeNull();
      expect(overResult.arrivalWarning?.exceededMinutes).toBe(overResult.overTimeMinutes);

      const safeParams = createBaseParams();
      safeParams.transportMethodIds = [1];
      safeParams.destination.time = '12:00';
      const safeResult = await executePlanning(safeParams);

      expect(safeResult.isOverTime).toBe(false);
      expect(safeResult.arrivalWarning ?? null).toBeNull();
    });

    it.each(PLANNING_MATRIX_CASES)(
      '[RED][%s] 滞在時間補正後も各スポット滞在時間が負値にならない',
      async (matrixCase) => {
        setupDeterministicRouteMock();
        const params = createPlanningParamsFromMatrix(matrixCase, 1);

        const result = await executePlanning(params);

        const stayDurations = params.spots.map((spot) => spot.stayDuration ?? 0);
        expect(stayDurations.every((duration) => duration >= 0)).toBe(true);
        expect(result.routes.length).toBeGreaterThan(0);
      },
    );
  });

  describe('長距離徒歩メッセージ', () => {
    it('距離が1.5km未満の場合はメッセージを追加しない', () => {
      const messages: Array<{ level: 'INFO' | 'WARNING'; segmentKey: string; message: string }> = [];

      pushLongWalkMessage(messages, 'A_TO_B', 40 * 60, 1499, '起点名', '目的地');

      expect(messages).toHaveLength(0);
    });

    it('距離が1.5kmちょうどかつ徒歩の場合はhh時間mm分形式でメッセージを追加する', () => {
      const messages: Array<{ level: 'INFO' | 'WARNING'; segmentKey: string; message: string }> = [];

      pushLongWalkMessage(messages, 'A_TO_B', 100 * 60, 1500, '起点名', '目的地');

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        level: 'WARNING',
        segmentKey: `${PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION}:A_TO_B`,
        message: '起点名から目的地は徒歩で1時間40分かかるため,最寄駅を推奨します',
      });
    });

    it('60分未満はhh時間を表示せずmm分のみを表示する', () => {
      const messages: Array<{ level: 'INFO' | 'WARNING'; segmentKey: string; message: string }> = [];

      pushLongWalkMessage(messages, 'A_TO_B', 40 * 60, 2000, '起点名', '目的地');

      expect(messages).toHaveLength(1);
      expect(messages[0].message).toBe('起点名から目的地は徒歩で40分かかるため,最寄駅を推奨します');
      expect(messages[0].message.includes('0時間')).toBe(false);
    });

    it('秒数は分に四捨五入して表示する', () => {
      const messages: Array<{ level: 'INFO' | 'WARNING'; segmentKey: string; message: string }> = [];

      // 29分31秒 -> 30分
      pushLongWalkMessage(messages, 'A_TO_B', 29 * 60 + 31, 2000, '起点名', '目的地');

      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('徒歩で30分かかるため');
    });
  });

  describe('補助関数', () => {
    it('所要時間テキストを分へ変換できる', () => {
      expect(parseDurationTextToMinutes('1時間20分')).toBe(80);
      expect(parseDurationTextToMinutes('45分')).toBe(45);
      expect(parseDurationTextToMinutes('不明')).toBe(0);
    });
  });

  describe('2点間のルート取得処理における、手段の重複除去確認', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    it('重複する手段が除去されること', async () => {
      const checkedTransportMethodIds = [1, 2, 3];
      const preferredTransportMethodIds = undefined;

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', '15分', '1.2 km');
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', '8分', '1.2 km');
        if (mode === 'DRIVING') return createRouteResult('DRIVING', '5分', '1.5 km');
        throw new Error('unexpected');
      });
      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [...checkedTransportMethodIds, preferredTransportMethodIds ?? 1],
        1.5,
        preferredTransportMethodIds,
      );

      expect(result.selectedRoute.transportMethodId).toBe(3);
      expect(result.alternativeRoutes).toHaveLength(3);
      expect(result.isFallbackToWalking).toBe(false);
      expect(result.failedRoutes).toBeUndefined();
    });
  });
});
