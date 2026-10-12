import { PlanLocationCandidateItemType } from '@shared/user/types';

import { DEFAULT_ARRIVAL_TIME, DEFAULT_DEPARTURE_AND_DESTINATION, DEFAULT_DEPARTURE_TIME } from '@/data/constants';
import { calculateDistance } from '@/data/mockNearestStation';
import { ExtendNearestStationType, ExtendPlanLocationType, TransportNodeType } from '@/types/plan';

type CandidateNearestStation = NonNullable<PlanLocationCandidateItemType['nearestStation']>;

/**
 * お気に入り候補の最寄駅をプラン用の最寄駅データに変換する
 * @param candidate - お気に入り候補
 * @param nearestStation - 候補に登録された最寄駅
 * @returns 出発地・目的地にセットする最寄駅
 */
function toNearestStation(
  candidate: PlanLocationCandidateItemType,
  nearestStation: CandidateNearestStation,
): ExtendNearestStationType {
  return {
    placeId: nearestStation.placeId,
    stationType: nearestStation.stationType,
    latitude: nearestStation.latitude,
    longitude: nearestStation.longitude,
    name: nearestStation.name,
    walkingTime: nearestStation.walkingTime,
    distance: calculateDistance(
      candidate.latitude,
      candidate.longitude,
      nearestStation.latitude,
      nearestStation.longitude,
    ),
    transitTime: 0,
  };
}

/**
 * お気に入り候補から出発地・目的地データを組み立てる
 * 最寄駅が登録されていれば、最寄駅を選択済みにして移動手段を公共交通機関にする
 * @param candidate - お気に入り候補（未指定なら既定の地点を使う）
 * @param locationType - 出発地か目的地か
 * @param time - 出発・到着時刻
 * @returns 出発地・目的地データ
 */
function buildPlanLocationFromCandidate(
  candidate: PlanLocationCandidateItemType | undefined,
  locationType: TransportNodeType.DEPARTURE | TransportNodeType.DESTINATION,
  time: string,
): ExtendPlanLocationType {
  const hasNearestStation = !!candidate?.nearestStation;
  return {
    name: candidate?.name ?? DEFAULT_DEPARTURE_AND_DESTINATION.name,
    latitude: candidate?.latitude ?? DEFAULT_DEPARTURE_AND_DESTINATION.latitude,
    longitude: candidate?.longitude ?? DEFAULT_DEPARTURE_AND_DESTINATION.longitude,
    locationType,
    time,
    travelTime: 0,
    userLocationId: candidate?.userLocationId ?? undefined,
    transportMethod: hasNearestStation ? 'TRANSIT' : 'DEFAULT',
    transportMethodId: hasNearestStation ? 4 : 0,
    isSetSelectedNearestStation: hasNearestStation,
    nearestStation: candidate?.nearestStation ? toNearestStation(candidate, candidate.nearestStation) : undefined,
    alternateRoutes: [],
  };
}

/**
 * お気に入り候補から出発地データを組み立てる
 * @param candidate - お気に入り候補（未指定なら既定の地点を使う）
 * @returns 出発地データ
 */
export function buildDepartureFromCandidate(candidate?: PlanLocationCandidateItemType): ExtendPlanLocationType {
  return buildPlanLocationFromCandidate(candidate, TransportNodeType.DEPARTURE, DEFAULT_DEPARTURE_TIME);
}

/**
 * お気に入り候補から目的地データを組み立てる
 * @param candidate - お気に入り候補（未指定なら既定の地点を使う）
 * @returns 目的地データ
 */
export function buildDestinationFromCandidate(candidate?: PlanLocationCandidateItemType): ExtendPlanLocationType {
  return buildPlanLocationFromCandidate(candidate, TransportNodeType.DESTINATION, DEFAULT_ARRIVAL_TIME);
}
