import { vi } from 'vitest';

import { getRoute } from '@/lib/plan';
import { type PlanningParams } from '@/lib/planning';
import { ExtendPlanLocationType } from '@/types/plan';

// プランニングテスト共通のデータ作成ヘルパー。
// getRoute は各 spec ファイルで vi.mock しておくこと（Google Maps API を呼ばないため）。
export const mockGetRoute = getRoute as unknown as ReturnType<typeof vi.fn>;

export function createBaseLocation(locationType: 'DEPARTURE' | 'DESTINATION'): ExtendPlanLocationType {
  return {
    name: locationType === 'DEPARTURE' ? '出発地' : '目的地',
    latitude: 35.681236,
    longitude: 139.767125,
    locationType,
    transportMethodId: 1,
    transportMethod: 'WALKING' as const,
    time: locationType === 'DEPARTURE' ? '09:00' : '11:00',
    travelTime: 0,
    alternateRoutes: [],
  };
}

export function createBaseParams(): PlanningParams {
  return {
    date: '2026-04-28',
    departure: createBaseLocation('DEPARTURE') as PlanningParams['departure'],
    destination: createBaseLocation('DESTINATION') as PlanningParams['destination'],
    spots: [
      {
        id: 'spot-1',
        spotId: 'spot-1',
        name: 'スポット1',
        latitude: 35.6895,
        longitude: 139.6917,
        stayStart: '10:00',
        stayEnd: '11:00',
        stayDuration: 60,
        memo: '',
        rating: 4,
        transportMethodId: 1,
        transportMethod: 'WALKING',
        travelTime: 15,
        order: 1,
      },
    ],
    transportMethodIds: [1, 2, 3],
  };
}

export function createRouteResult(
  transportMethod: 'WALKING' | 'DRIVING' | 'BICYCLING',
  duration: number,
  distance: number,
) {
  return {
    path: [
      { lat: 35.681236, lng: 139.767125 },
      { lat: 35.6895, lng: 139.6917 },
    ],
    distance,
    duration,
    transportMethod,
  };
}

export type TransportPattern = 'SINGLE' | 'MULTI';
export type NearestStationPattern = 'WITHOUT_STATION' | 'WITH_STATION';
export type CandidatePattern = 'EMPTY' | 'VALID' | 'PAST';
export type PlanningTypePattern = 'BOTH';

export type PlanningMatrixCase = {
  id: string;
  transportPattern: TransportPattern;
  nearestStationPattern: NearestStationPattern;
  candidatePattern: CandidatePattern;
  planningTypePattern: PlanningTypePattern;
};

export const TRANSPORT_PATTERNS: TransportPattern[] = ['SINGLE', 'MULTI']; //移動手段が単数か複数か
export const NEAREST_STATION_PATTERNS: NearestStationPattern[] = ['WITHOUT_STATION', 'WITH_STATION']; //最寄駅の有無
export const CANDIDATE_PATTERNS: CandidatePattern[] = ['EMPTY', 'VALID', 'PAST']; //最寄駅の発車時間の候補のパターン
export const PLANNING_TYPE_PATTERNS: PlanningTypePattern[] = ['BOTH']; //プランニングにおけるアルゴリズムのタイプ

export const PLANNING_MATRIX_CASES: PlanningMatrixCase[] = PLANNING_TYPE_PATTERNS.flatMap((planningTypePattern) =>
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

export function createCandidateTimes(pattern: CandidatePattern): string[] {
  if (pattern === 'EMPTY') return [];
  if (pattern === 'VALID') return ['09:20', '09:35', '09:50'];
  return ['08:20', '08:40', '09:00'];
}

export function createPlanningParamsFromMatrix(
  matrixCase: PlanningMatrixCase,
  stayDurationMinutes: number,
): PlanningParams {
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

  // TODO: #366で完全に削除する
  // if (matrixCase.planningTypePattern === 'FORWARD') {
  //   params.departure.time = '09:00';
  //   params.destination.time = undefined;
  // }

  // if (matrixCase.planningTypePattern === 'BACKWARD') {
  //   params.departure.time = undefined;
  //   params.destination.time = '12:00';
  // }

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

export function createTwoSpotParams(firstSpotStayDurationMinutes: number): PlanningParams {
  const params = createBaseParams();
  params.departure.time = '09:00';
  params.destination.time = '13:00';
  params.transportMethodIds = [1];
  params.spots = [
    {
      id: 'spot-1',
      spotId: 'spot-1',
      name: 'スポット1',
      latitude: 35.6895,
      longitude: 139.6917,
      stayStart: '10:00',
      stayEnd: '11:00',
      stayDuration: firstSpotStayDurationMinutes,
      memo: '',
      rating: 4,
      transportMethodId: 1,
      transportMethod: 'WALKING',
      travelTime: 0,
      order: 1,
    },
    {
      id: 'spot-2',
      spotId: 'spot-2',
      name: 'スポット2',
      latitude: 35.6982,
      longitude: 139.7731,
      stayStart: '11:00',
      stayEnd: '12:00',
      stayDuration: 60,
      memo: '',
      rating: 4,
      transportMethodId: 1,
      transportMethod: 'WALKING',
      travelTime: 15,
      order: 2,
    },
  ];

  return params;
}

export function setupDeterministicRouteMock(): void {
  mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
    if (mode === 'WALKING') return createRouteResult('WALKING', 15, 1500);
    if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 10, 1500);
    if (mode === 'DRIVING') return createRouteResult('DRIVING', 8, 2000);
    throw new Error(`unexpected mode: ${mode}`);
  });
}
