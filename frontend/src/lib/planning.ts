import { TransportMethodType } from '@shared/transports/types';

import {
  TravelPlanType,
  TravelModeType,
  ExtendSpotType,
  ExtendPlanLocationType,
  ExtendNearestStationType,
} from '@/types/plan';
import {
  DEFAULT_DEPARTURE_TIME,
  DEPARTURE_NAME,
  DESTINATION_NAME,
  PLANNING_DIRTY_DEPARTURE_AND_DESTINATION_FIELDS,
  PLANNING_DIRTY_NEAREST_STATION_FIELDS,
  PLANNING_DIRTY_SPOT_FIELDS,
  PLANNING_MESSAGE_PRIORITY,
  PLANNING_MESSAGE_SEGMENT,
  THRESHOLD_FOR_DISTANCE,
} from '@/data/constants';

import { getRoute } from './plan';
import { calcDistance } from './algorithm';

export type ArrivalWarning = {
  exceededMinutes: number;
  suggestedDepartureTime: string;
  suggestedStayReductionMinutes: number;
};

export type PlanningInfo = {
  transportationMethodId: number[];
};

/**
 * プランニング入力パラメータ
 */
export type PlanningParams = {
  date: string;
  departure: ExtendPlanLocationType;
  destination: ExtendPlanLocationType;
  spots: ExtendSpotType[];
  transportMethodIds: number[];
  /** 区間キーごとの優先移動手段ID（再プランニング時の優先採用用） */
  preferredTransportMethodIds?: Record<string, number>;
  /** 区間キーごとの優先発車時間（再プランニング時の優先採用用） */
  preferredDepartureTimes?: Record<string, string>;
};

/**
 * プランニング結果
 */
export type PlanningResult = {
  routes: RouteInfo[];
  totalDistance: number; // メートル
  totalDuration: number; // 秒
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  isOverTime: boolean; // 到着時間を超過しているか
  overTimeMinutes?: number; // 超過分数
  /** 余裕時間（分） - 到着時間より早く着く場合に設定 */
  extraTimeMinutes?: number;
  /** 余裕時間がある場合の提案メッセージ（planning.ts で生成） */
  extraTimeMessage?: string;
  /** 到着時間超過警告 */
  arrivalWarning?: ArrivalWarning | null;
  messages: PlanningMessage[];
  /** 更新されたスポットの情報 */
  updatedSpots: ExtendSpotType[];
  /** 更新された出発地情報 */
  updatedDeparture: ExtendPlanLocationType;
  /** 更新された目的地情報 */
  updatedDestination: ExtendPlanLocationType;
};

export type PlanningMessageLevel = 'INFO' | 'WARNING' | 'ERROR';

export type PlanningMessage = {
  level: PlanningMessageLevel;
  segmentKey: string;
  message: string;
};

export type PlanningComputationResult = {
  isValid: boolean;
  departureTime?: string;
  destinationTime?: string;
  plannedSpots: TravelPlanType['spots'];
  arrivalWarning: ArrivalWarning | null;
  messages: PlanningMessage[];
  errors: string[];
};

export type DepartureCandidateSelection = {
  selectedTime: string;
  level?: PlanningMessageLevel;
  message?: string;
  segmentType?: string;
};

export type TransportCandidateInput = {
  type: string;
  minutes?: number | null;
  isAvailable?: boolean;
};

export type TransportCandidate = {
  type: string;
  minutes: number;
  isDisabled: boolean;
};

export type DirectDistanceInfoInput = {
  kind: 'DIRECT';
  from: string;
  to: string;
  minutes: number;
};

export type StationDistanceInfoInput = {
  kind: 'STATION';
  from: string;
  fromStation: string;
  toStation: string;
  to: string;
  walkToStationMinutes: number;
  stationTransitMinutes: number;
  walkFromStationMinutes: number;
};

/**
 * ルート情報を構築するための必要パラメータ
 */
export type BuildRouteInfoParams = {
  fromSpotId: string;
  toSpotId: string;
  fromType: 'DEPARTURE' | 'DESTINATION' | 'SPOT';
  routeType: 'DEPARTURE_TO_SPOT' | 'SPOT_TO_SPOT' | 'SPOT_TO_DESTINATION' | 'TO_STATION' | 'STATION_TO_STATION';
  toType: 'DEPARTURE' | 'DESTINATION' | 'SPOT';
  routeResult: RouteSelectionResult;
};

/**
 * ルート情報
 */
export type RouteInfo = {
  id: string; // ルート識別子
  fromSpotId: string;
  toSpotId: string;
  fromType: 'DEPARTURE' | 'DESTINATION' | 'SPOT';
  routeType: 'DEPARTURE_TO_SPOT' | 'SPOT_TO_SPOT' | 'SPOT_TO_DESTINATION' | 'TO_STATION' | 'STATION_TO_STATION';
  toType: 'DEPARTURE' | 'DESTINATION' | 'SPOT';
  transportMethod: TransportMethodType; // 移動手段
  transportMethodId: number;
  distance: number; // メートル
  duration: number; // 分
  polyline?: string; // Google Maps Polyline
  useNearestStation?: boolean; // 最寄駅を経由するか
  nearestStationId?: number; // 経由する最寄駅のID
  /** 代替ルート情報 - プレビュー画面での切り替え用 */
  alternativeRoutes: AlternativeRouteInfo[];
};

/**
 * 代替ルート情報（選択されなかった移動手段のルート）
 */
export type AlternativeRouteInfo = {
  transportMethodId: number;
  transportMethod: TransportMethodType;
  duration: number; // 分
  distance: number; // メートル
  /** 最寄駅経由ルートの場合true（徒歩→電車→徒歩をまとめた1候補） */
  isStationRoute?: boolean;
};

export type DistanceInfoInput = DirectDistanceInfoInput | StationDistanceInfoInput;

export type CandidateSelectionState = {
  selectedTransport?: TransportMethodType;
  selectedDepartureTime?: string;
  [key: string]: unknown;
};

export function timeToMinutes(time: string): number {
  const matched = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!matched) return 0;
  return Number(matched[1]) * 60 + Number(matched[2]);
}

export function minutesToTime(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function buildStationMarkerKey(station: { placeId?: string; lat: number; lng: number }): string {
  if (station.placeId && station.placeId.trim().length > 0) return station.placeId;
  return `${station.lat.toFixed(6)}:${station.lng.toFixed(6)}`;
}

export function buildTransportCandidates(input: TransportCandidateInput[]): TransportCandidate[] {
  return input.map((candidate) => {
    const minutes = candidate.minutes ?? 0;
    const isDisabled = candidate.isAvailable === false || minutes < 0;
    return {
      type: candidate.type,
      minutes,
      isDisabled,
    };
  });
}

type CandidateSwitchHandlers = {
  nextTransport?: TravelModeType;
  nextDepartureTime?: string;
  setSelectedTransport?: (mode: TravelModeType) => void;
  setSelectedDepartureTime?: (time: string) => void;
  recalculateRoute?: () => void;
  recalculateTimeline?: () => void;
};

/**
 * 座標配列をポリラインエンコード
 */
function encodePolyline(path: google.maps.LatLngLiteral[]): string {
  if (!path || path.length === 0) return '';

  // Google Polyline Encoding Algorithm の簡易実装
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of path) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);

    encoded += encodeSignedNumber(lat - prevLat);
    encoded += encodeSignedNumber(lng - prevLng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

/**
 * 符号付き整数をエンコード
 */
function encodeSignedNumber(num: number): string {
  let sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~sgn_num;
  }

  let encoded = '';
  while (sgn_num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>= 5;
  }
  encoded += String.fromCharCode(sgn_num + 63);

  return encoded;
}

export function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const path: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return path;
}

/**
 * 候補切替時の更新ハンドラ。
 * 本機能では再計算を行わず、表示に必要な選択状態のみ更新する。
 */
export function applyCandidateSwitchHandlers(handlers: CandidateSwitchHandlers): void {
  if (handlers.nextTransport && handlers.setSelectedTransport) {
    handlers.setSelectedTransport(handlers.nextTransport);
  }

  if (handlers.nextDepartureTime && handlers.setSelectedDepartureTime) {
    handlers.setSelectedDepartureTime(handlers.nextDepartureTime);
  }
}

/**
 * 候補切替時に更新対象フィールドのみを差し替える。
 */
export function updateCandidateSelectionState<T extends CandidateSelectionState>(
  state: T,
  updates: {
    selectedTransport?: TravelModeType;
    selectedDepartureTime?: string;
  },
): T {
  return {
    ...state,
    ...(updates.selectedTransport !== undefined ? { selectedTransport: updates.selectedTransport } : {}),
    ...(updates.selectedDepartureTime !== undefined ? { selectedDepartureTime: updates.selectedDepartureTime } : {}),
  };
}

export function calcStayDurationMinutes(stayStart: string, stayEnd: string): number {
  return Math.max(timeToMinutes(stayEnd) - timeToMinutes(stayStart), 0);
}

function resolveLocationTime(time: string | undefined, fallback: string): string {
  return time && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : fallback;
}

function isValidTimeFormat(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

/**
 * 最寄駅フォームで入力された発車時間候補から、駅到着時間を考慮して有効な発車時間を選択する。
 * 選択ルール：
 * 1. 駅到着時間の1分後を閾値とし、候補の中で最も早い有効な発車時間を選択する。
 * 2. 有効な候補がない場合、閾値の時間を自動的に選択する。
 * @param stationArrivalMinutes 駅到着時間（分単位）
 * @param candidates 発車時間候補（HH:mm形式の文字列配列）
 * @returns 選択された発車時間と警告メッセージ
 */
export function selectDepartureCandidate(
  stationArrivalMinutes: number,
  candidates: string[],
): DepartureCandidateSelection {
  const threshold = stationArrivalMinutes + 1;
  const validCandidates = candidates.filter((candidate) => isValidTimeFormat(candidate));
  const candidateMinutes = validCandidates.map((candidate) => timeToMinutes(candidate));
  const eligible = candidateMinutes.filter((value) => value >= threshold);

  if (eligible.length > 0) {
    const selected = Math.min(...eligible);
    return {
      selectedTime: minutesToTime(selected),
    };
  }

  if (validCandidates.length === 0) {
    return {
      selectedTime: minutesToTime(threshold),
      level: 'WARNING',
      message: '発車時間が未入力のため、最寄駅到着の1分後に設定しました。',
      segmentType: PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY,
    };
  }

  return {
    selectedTime: minutesToTime(threshold),
    level: 'WARNING',
    message:
      '入力した発車時間が最寄駅到着時間より前になるため、発車時間を調整しました。発車時間の見直しまたはスポットの見直しを行ってください。',
    segmentType: PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED,
  };
}

function buildSegmentKey(segmentType: string, segmentKey?: string): string {
  if (!segmentKey) return segmentType;
  return `${segmentType}:${segmentKey}`;
}

export function formatDurationAsHourMinute(minutes: number): string {
  const safeMinutes = Math.max(Math.floor(minutes), 0);
  const hours = Math.floor(safeMinutes / 60);
  const remains = safeMinutes % 60;
  return minutes < 60 ? `${remains}分` : `${hours}時間${remains}分`;
}

export function formatDistanceAsKilometer(distance: number): string {
  const safeDistance = Math.max(distance, 0);
  return `${(safeDistance / 1000).toFixed(1)}km`;
}

/**
 * 長距離メッセージ作成
 * @param messages - メッセージ一覧
 * @param segmentKey - 識別用セグメントキー（例: "SPOT1_TO_SPOT2"）
 * @param durationMin - 移動時間（分単位）
 * @param distanceM - 移動距離（メートル単位）
 * @param originName - 出発地の名称（例: "スポットA"）
 * @param targetName - 到着地の名称（例: "スポットB"）
 * @returns
 */
export function pushLongWalkMessage(
  messages: PlanningMessage[],
  segmentKey: string,
  durationMin: number,
  distanceM: number,
  originName: string,
  targetName: string,
): void {
  if (distanceM < THRESHOLD_FOR_DISTANCE) return;
  const minutes = Math.max(durationMin, 0);
  messages.push({
    level: 'WARNING',
    segmentKey: buildSegmentKey(PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION, segmentKey),
    message: `${originName}から${targetName}は徒歩で${formatDurationAsHourMinute(minutes)}かかるため,最寄駅を推奨します`,
  });
}

function pushRouteFailureMessages(
  messages: PlanningMessage[],
  segmentKey: string,
  failedRoutes?: RouteFailureInfo[],
  isFallbackToWalking?: boolean,
): void {
  if (!failedRoutes || failedRoutes.length === 0) return;

  // 失敗一覧に徒歩(1)が含まれる場合は、徒歩も含めて取得失敗
  const hasWalkingFailure = failedRoutes.some((failure) => failure.transportMethodId === 1);
  if (hasWalkingFailure) {
    messages.unshift({
      level: 'WARNING',
      segmentKey: buildSegmentKey(PLANNING_MESSAGE_SEGMENT.ROUTE_FETCH_FAILED, segmentKey),
      message: 'ルートが取得できませんでした。スポットの見直しをしてください。',
    });
    return;
  }

  if (isFallbackToWalking) {
    const failedMethodNames = failedRoutes
      .filter((f) => f.transportMethodId !== 1)
      .map((f) => getTransportMethodLabel(f.transportMethodId))
      .join('、');

    const methodPrefix = failedMethodNames ? `${failedMethodNames}の` : '';
    messages.push({
      level: 'WARNING',
      segmentKey: buildSegmentKey(PLANNING_MESSAGE_SEGMENT.ROUTE_FALLBACK_WALKING, segmentKey),
      message: `${methodPrefix}ルートが取得できませんでしたので徒歩のルートを取得しました。`,
    });
    return;
  }
}

function buildOverTimeSuggestionMessage(overMinutes: number): string {
  if (overMinutes <= 30) {
    return `滞在時間を${overMinutes}分減らしてみましょう。`;
  }
  if (overMinutes <= 60) {
    return '各スポットの滞在時間を減らすか他の移動手段を検討してみましょう';
  }
  return 'スポットの見直しをしてみましょう。';
}

function createArrivalWarning(
  departureTime: string,
  deadlineMinutes: number,
  arrivalMinutes: number,
): ArrivalWarning | null {
  const exceededMinutes = arrivalMinutes - deadlineMinutes;

  if (exceededMinutes <= 0) return null;

  return {
    exceededMinutes,
    suggestedDepartureTime: minutesToTime(timeToMinutes(departureTime) - exceededMinutes),
    suggestedStayReductionMinutes: exceededMinutes,
  };
}

/**
 * TravelModeTypeをGoogle Maps API用に変換
 */
const TRAVEL_MODE_MAP: Record<number, TravelModeType> = {
  1: 'WALKING', // 徒歩
  2: 'BICYCLING', // 自転車
  3: 'DRIVING', // 車
};

/**
 * 移動手段IDからTravelModeTypeを取得
 */
export function getTravelModeFromId(transportMethodId: number): TravelModeType {
  return TRAVEL_MODE_MAP[transportMethodId] || 'WALKING';
}

/**
 * 移動手段IDから表示名を取得
 */
function getTravelMethodName(transportMethodId: number): RouteInfo['transportMethod'] {
  switch (transportMethodId) {
    case 1:
      return 'WALKING';
    case 2:
      return 'BICYCLING';
    case 3:
      return 'DRIVING';
    case 4:
      return 'TRANSIT';
    default:
      return 'WALKING';
  }
}

/**
 * 移動手段IDからラベルを取得
 */
export function getTransportMethodLabel(methodId: number): string {
  switch (methodId) {
    case 1:
      return '徒歩';
    case 2:
      return '自転車';
    case 3:
      return '車';
    case 4:
      return '電車/バス';
    default:
      return '不明';
  }
}

/**
 * 移動手段の優先順位を返す
 * 画面設計書: 取得の優先順位は徒歩<自転車<車
 * 値が大きいほど優先度が高い
 */
function getTransportMethodPriority(methodId: number): number {
  switch (methodId) {
    case 1: // 徒歩
      return 1;
    case 2: // 自転車
      return 2;
    case 3: // 車
      return 3;
    default:
      return 0;
  }
}

/**
 * 指定した移動手段IDが最寄駅経由の公共交通手段かを判定する。
 * @param methodId 判定対象の移動手段ID
 * @returns 電車またはバス相当のIDならtrue
 */
function isStationTransportMethod(methodId?: number): boolean {
  return methodId === 4;
}

/**
 * 変更前後のスポットを比較し、dirty対象項目に差分があるかを判定する。
 * @param previousSpot 変更前のスポット
 * @param nextSpot 変更後のスポット
 * @returns dirty対象項目に差分がある場合はtrue
 */
export function hasDirtySpotChange(previousSpot: ExtendSpotType, nextSpot: ExtendSpotType): boolean {
  return PLANNING_DIRTY_SPOT_FIELDS.some((field) => {
    return (
      JSON.stringify(previousSpot[field]) !== JSON.stringify(nextSpot[field]) ||
      PLANNING_DIRTY_NEAREST_STATION_FIELDS.some((nearestStationField) => {
        if (!previousSpot.nearestStation || !nextSpot.nearestStation) {
          return previousSpot.nearestStation !== nextSpot.nearestStation;
        }
        return (
          JSON.stringify(previousSpot.nearestStation[nearestStationField]) !==
          JSON.stringify(nextSpot.nearestStation[nearestStationField])
        );
      })
    );
  });
}

/**
 * 変更前後の出発地/目的地を比較し、dirty対象項目に差分があるかを判定する。
 * @param previousSpot 変更前の出発地/目的地
 * @param nextSpot 変更後の出発地/目的地
 * @returns dirty対象項目に差分がある場合はtrue
 */
export function hasDirtyDepartureAndDestinationChange(
  previousSpot: ExtendPlanLocationType,
  nextSpot: ExtendPlanLocationType,
): boolean {
  return PLANNING_DIRTY_DEPARTURE_AND_DESTINATION_FIELDS.some((field) => {
    return (
      JSON.stringify(previousSpot[field]) !== JSON.stringify(nextSpot[field]) ||
      PLANNING_DIRTY_NEAREST_STATION_FIELDS.some((nearestStationField) => {
        if (!previousSpot.nearestStation || !nextSpot.nearestStation) {
          return previousSpot.nearestStation !== nextSpot.nearestStation;
        }
        return (
          JSON.stringify(previousSpot.nearestStation[nearestStationField]) !==
          JSON.stringify(nextSpot.nearestStation[nearestStationField])
        );
      })
    );
  });
}

/**
 * ルート取得失敗情報
 */
type RouteFailureInfo = {
  transportMethodId: number;
  reason: string;
  failed?: boolean;
};

type RouteResult = {
  path: google.maps.LatLngLiteral[];
  distance: number;
  duration: number;
  waitingMinutes?: number; // TRANSITの場合の待ち時間（分）
  transportMethod: TravelModeType;
};

type RouteWithMethod = RouteResult & { transportMethodId: number };

/**
 * ルート選択結果（選択ルート + 代替ルート）
 */
type RouteSelectionResult = {
  /** 選択されたルート */
  selectedRoute: RouteWithMethod;
  /** 代替ルート一覧（選択ルートを先頭に、取得できた他の手段と最寄駅経由を含む） */
  alternativeRoutes: RouteWithMethod[];
  /** ルート取得失敗した交通手段 */
  failedRoutes?: RouteFailureInfo[];
  /** 徒歩でフォールバックしたか */
  isFallbackToWalking?: boolean;
};

/** 23:59 を通算分で表した値。到着がこれを超えるとエラーにする */
const DAY_END_MINUTES = 24 * 60 - 1;

const MINUTES_PER_DAY = 24 * 60;

/**
 * 直接手段（徒歩・自転車・車）のルートを取得し、優先度順（車＞自転車＞徒歩）に並べる。
 * @param from 出発地点
 * @param to 到着地点
 * @param transportMethodIds 取得する移動手段ID（1〜3 以外は無視する）
 * @returns 取得できたルートと、取得に失敗した手段
 */
async function fetchDirectRoutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  transportMethodIds: number[],
): Promise<{ sortedRoutes: RouteWithMethod[]; failedRoutes: RouteFailureInfo[] }> {
  const routes: RouteWithMethod[] = [];
  const failedRoutes: RouteFailureInfo[] = [];

  for (const methodId of Array.from(new Set(transportMethodIds))) {
    const mode = TRAVEL_MODE_MAP[methodId];
    if (!mode) continue; // 最寄駅経由(4)や未設定(0)は直接手段ではない

    try {
      const result = await getRoute(from, to, mode);
      if (result && result.distance) {
        routes.push({ ...result, transportMethodId: methodId });
      } else {
        // 結果が空の場合も失敗として記録
        failedRoutes.push({
          transportMethodId: methodId,
          reason: 'ルートが見つかりませんでした',
          failed: true,
        });
      }
    } catch (error) {
      console.error(`ルート取得失敗 (mode: ${mode}):`, error);
      failedRoutes.push({
        transportMethodId: methodId,
        reason: error instanceof Error ? error.message : 'ルート取得に失敗しました',
        failed: true,
      });
    }
  }

  const sortedRoutes = [...routes].sort(
    (left, right) =>
      getTransportMethodPriority(right.transportMethodId) - getTransportMethodPriority(left.transportMethodId),
  );

  return { sortedRoutes, failedRoutes };
}

/**
 * 直接手段が1件も取得できなかったときに、徒歩でルートを取り直す。
 * 徒歩でも取得できなければ距離0・所要0のルートを返す。
 */
async function fetchWalkingFallback(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  failedRoutes: RouteFailureInfo[],
): Promise<RouteSelectionResult> {
  try {
    const fallback = await getRoute(from, to, 'WALKING');
    return {
      selectedRoute: { ...fallback, transportMethodId: 1 },
      alternativeRoutes: [],
      failedRoutes: failedRoutes.length > 0 ? failedRoutes : undefined,
      isFallbackToWalking: failedRoutes.length > 0,
    };
  } catch (error) {
    // 徒歩でも取得できなかった場合（非常にレアなケース）
    console.error('徒歩ルートも取得できませんでした:', error);
    return {
      selectedRoute: {
        path: [from, to],
        distance: 0,
        duration: 0,
        transportMethod: 'WALKING',
        transportMethodId: 1,
      },
      alternativeRoutes: [],
      failedRoutes: [
        ...failedRoutes,
        {
          transportMethodId: 1,
          reason: error instanceof Error ? error.message : '徒歩ルートも取得できませんでした',
          failed: true,
        },
      ],
      isFallbackToWalking: true,
    };
  }
}

/**
 * 2点間の直接手段のルートを取得し、最適なものを選択する（最寄駅経由は planSegment で扱う）。
 * 代替ルートも含めて返却
 *
 * @param from 出発地点
 * @param to 到着地点
 * @param transportMethodIds 利用可能な移動手段のID配列
 * @param preferredTransportMethodId 優先的に使用する移動手段ID（transportMethodIds に含まれるときだけ採用される）
 */
export async function getOptimalRouteWithAlternatives(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  transportMethodIds: number[],
  preferredTransportMethodId?: number,
): Promise<RouteSelectionResult> {
  const { sortedRoutes, failedRoutes } = await fetchDirectRoutes(from, to, transportMethodIds);
  const selectedRoute =
    sortedRoutes.find((route) => route.transportMethodId === preferredTransportMethodId) ?? sortedRoutes[0];

  // ルートが取得できなかった場合は徒歩でフォールバック
  if (selectedRoute === undefined) {
    return fetchWalkingFallback(from, to, failedRoutes);
  }

  return {
    selectedRoute,
    alternativeRoutes: [selectedRoute, ...sortedRoutes.filter((route) => route !== selectedRoute)],
    failedRoutes: failedRoutes.length > 0 ? failedRoutes : undefined,
    isFallbackToWalking: false,
  };
}

/**
 * 最寄駅経由の計算結果
 */
type NearestStationSegment = {
  /** 徒歩→電車→徒歩をまとめた1候補（移動手段ID 4） */
  route: RouteWithMethod;
  scheduledDepartureTime: string;
  waitingTime: number;
  transitTime: number;
  candidateSelection: DepartureCandidateSelection;
};

/**
 * 駅到着から採用した発車時間までの待ち時間（分）を返す。
 * 駅到着は通算分（24*60 を超えてよい）、発車時間は HH:mm のため、同じ日の中で比較する。
 */
function calculateWaitingMinutes(stationArrivalMinutes: number, selectedTime: string): number {
  const dayOffset = Math.floor(stationArrivalMinutes / MINUTES_PER_DAY) * MINUTES_PER_DAY;
  let departureMinutes = timeToMinutes(selectedTime) + dayOffset;
  if (departureMinutes < stationArrivalMinutes) departureMinutes += MINUTES_PER_DAY;
  return departureMinutes - stationArrivalMinutes;
}

/**
 * 最寄駅経由のルートを計算する。乗車時間と発車時間候補は出発側の最寄駅のものを使う。
 * @param originStation 出発側ノードの最寄駅
 * @param destinationStation 到着側ノードの最寄駅
 * @param originCoord 出発側ノードの座標
 * @param destinationCoord 到着側ノードの座標
 * @param currentMinutes 区間の開始時刻（通算分）
 * @param preferredDepartureTime 発車時間候補が空のときに使う前回の発車時間
 */
function calculateNearestStationSegment(
  originStation: ExtendNearestStationType,
  destinationStation: ExtendNearestStationType,
  originCoord: { lat: number; lng: number },
  destinationCoord: { lat: number; lng: number },
  currentMinutes: number,
  preferredDepartureTime?: string,
): NearestStationSegment {
  const walkToStation = Math.max(originStation.walkingTime ?? 0, 0);
  const transitTime = Math.max(originStation.transitTime ?? 0, 0);
  const walkFromStation = Math.max(destinationStation.walkingTime ?? 0, 0);
  const stationArrivalMinutes = currentMinutes + walkToStation;

  // 計算用の候補。ユーザーの入力が無ければ前回の発車時間を使う（ノードには書き戻さない）
  const inputCandidates = originStation.scheduledDepartureTimes ?? [];
  const candidates =
    inputCandidates.length > 0 ? inputCandidates : preferredDepartureTime ? [preferredDepartureTime] : [];
  const candidateSelection = selectDepartureCandidate(stationArrivalMinutes, candidates);
  const waitingTime = calculateWaitingMinutes(stationArrivalMinutes, candidateSelection.selectedTime);

  const originStationCoord = { lat: originStation.latitude, lng: originStation.longitude };
  const destinationStationCoord = { lat: destinationStation.latitude, lng: destinationStation.longitude };
  const distance =
    calcDistance(originCoord, originStationCoord) +
    calcDistance(originStationCoord, destinationStationCoord) +
    calcDistance(destinationStationCoord, destinationCoord);

  return {
    route: {
      path: [],
      distance,
      duration: walkToStation + waitingTime + transitTime + walkFromStation,
      transportMethod: 'TRANSIT',
      transportMethodId: 4,
    },
    scheduledDepartureTime: candidateSelection.selectedTime,
    waitingTime,
    transitTime,
    candidateSelection,
  };
}

/**
 * 区間の端点
 */
type SegmentNode = {
  name: string;
  latitude: number;
  longitude: number;
  nearestStation?: ExtendNearestStationType;
};

type SegmentInput = {
  segmentKey: string;
  from: SegmentNode;
  to: SegmentNode;
  /** 区間開始時刻（通算分。24*60 を超えてよい） */
  currentMinutes: number;
  /** プランで選んだ移動手段 */
  transportMethodIds: number[];
  preferredMethodId?: number;
  preferredDepartureTime?: string;
};

type SegmentResult = {
  routeResult: RouteSelectionResult;
  /** 区間の移動時間（分）。routeResult.selectedRoute.duration と常に一致する */
  travelMinutes: number;
  /** 両端に最寄駅があるときの最寄駅経由の計算結果 */
  stationSegment?: NearestStationSegment;
  messages: PlanningMessage[];
};

/**
 * 1区間のルートを計算する。出発地 → スポット1、スポット間、最終スポット → 目的地のすべてで使う。
 * 選択ルール:
 * 1. 優先手段が徒歩・自転車・車で、プランの移動手段に含まれていて取得できたら、それを選ぶ。
 * 2. それ以外で両端に最寄駅があれば、最寄駅経由（ID 4）を選ぶ。
 * 3. それ以外は優先度が最も高い手段（車＞自転車＞徒歩）。1件も取れなければ徒歩で取り直す。
 * 最寄駅経由のルートは、選ばれなくても代替ルートに必ず含める。
 */
async function planSegment(input: SegmentInput): Promise<SegmentResult> {
  const fromCoord = { lat: input.from.latitude, lng: input.from.longitude };
  const toCoord = { lat: input.to.latitude, lng: input.to.longitude };
  const fromStation = input.from.nearestStation;
  const toStation = input.to.nearestStation;
  const messages: PlanningMessage[] = [];

  const { sortedRoutes, failedRoutes } = await fetchDirectRoutes(fromCoord, toCoord, input.transportMethodIds);
  const stationSegment =
    fromStation && toStation
      ? calculateNearestStationSegment(
          fromStation,
          toStation,
          fromCoord,
          toCoord,
          input.currentMinutes,
          input.preferredDepartureTime,
        )
      : undefined;

  const preferredRoute = sortedRoutes.find((route) => route.transportMethodId === input.preferredMethodId);
  const selectedRoute = preferredRoute ?? stationSegment?.route ?? sortedRoutes[0];

  let routeResult: RouteSelectionResult;
  if (selectedRoute) {
    const otherRoutes = [...sortedRoutes, ...(stationSegment ? [stationSegment.route] : [])].filter(
      (route) => route !== selectedRoute,
    );
    routeResult = {
      selectedRoute,
      alternativeRoutes: [selectedRoute, ...otherRoutes],
      failedRoutes: failedRoutes.length > 0 ? failedRoutes : undefined,
      isFallbackToWalking: false,
    };
  } else {
    routeResult = await fetchWalkingFallback(fromCoord, toCoord, failedRoutes);
  }

  const selectedMethodId = routeResult.selectedRoute.transportMethodId;
  const candidateSelection = stationSegment?.candidateSelection;
  if (isStationTransportMethod(selectedMethodId) && candidateSelection?.level && candidateSelection.message) {
    messages.push({
      level: candidateSelection.level,
      segmentKey: buildSegmentKey(
        candidateSelection.segmentType ?? PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED,
        input.segmentKey,
      ),
      message: candidateSelection.message,
    });
  }

  pushRouteFailureMessages(messages, input.segmentKey, routeResult.failedRoutes, routeResult.isFallbackToWalking);

  const isOneSideStation = !!fromStation !== !!toStation;
  if (isOneSideStation) {
    // 最寄駅を設定済みの側があるため、長距離徒歩の「最寄駅を推奨します」は出さない
    const missingSideName = fromStation ? input.to.name : input.from.name;
    messages.push({
      level: 'WARNING',
      segmentKey: buildSegmentKey(PLANNING_MESSAGE_SEGMENT.NEAREST_STATION_ONE_SIDE, input.segmentKey),
      message: `${missingSideName}の最寄駅が未設定のため、最寄駅を使わないルートで計算しました。`,
    });
  } else if (selectedMethodId === 1) {
    // 移動手段が徒歩で1.5km以上離れている場合は、警告メッセージを格納する
    pushLongWalkMessage(
      messages,
      input.segmentKey,
      routeResult.selectedRoute.duration,
      routeResult.selectedRoute.distance,
      input.from.name,
      input.to.name,
    );
  }

  return {
    routeResult,
    travelMinutes: routeResult.selectedRoute.duration,
    stationSegment,
    messages,
  };
}

function buildRouteInfo(params: BuildRouteInfoParams): RouteInfo {
  const selectedRoute = params.routeResult.selectedRoute;
  return {
    id: `route-${params.fromSpotId}-to-${params.toSpotId}`,
    fromSpotId: params.fromSpotId,
    toSpotId: params.toSpotId,
    fromType: params.fromType,
    toType: params.toType,
    routeType: params.routeType,
    transportMethod: selectedRoute.transportMethod,
    transportMethodId: selectedRoute.transportMethodId,
    distance: selectedRoute.distance,
    duration: selectedRoute.duration,
    polyline: encodePolyline(selectedRoute.path),
    useNearestStation: isStationTransportMethod(selectedRoute.transportMethodId),
    alternativeRoutes: params.routeResult.alternativeRoutes,
  };
}

/**
 * 区間キーを作る（DEPARTURE_TO_FIRST_SPOT / SPOT_{id}_TO_{id} / SPOT_{id}_TO_DESTINATION）。
 * @param fromSpotId 出発側スポットのID（出発地のときは undefined）
 * @param toSpotId 到着側スポットのID（目的地のときは undefined）
 */
export function buildPlanningSegmentKey(fromSpotId?: string, toSpotId?: string): string {
  if (!fromSpotId) return 'DEPARTURE_TO_FIRST_SPOT';
  if (!toSpotId) return `SPOT_${fromSpotId}_TO_DESTINATION`;
  return `SPOT_${fromSpotId}_TO_${toSpotId}`;
}

/**
 * 出発時間からプランニングするアルゴリズム
 * 処理概要
 * 1. 区間（出発地 → スポット1、スポット間、最終スポット → 目的地）ごとに planSegment でルートと移動時間を計算する
 * 2. 移動時間と各スポットの滞在時間を通算分で積み上げ、最終的な到着時間を算出する
 * 3. 移動時間・移動手段・最寄駅の計算結果は、区間の出発側ノードに書き戻す
 * @param params PlanningParams
 * @returns ルート情報、到着時間（通算分と HH:mm）、警告メッセージ、総移動時間、総移動距離
 */
async function runForwardPlanning(params: PlanningParams): Promise<{
  routes: RouteInfo[];
  arrivalTime: string;
  arrivalMinutes: number;
  messages: PlanningMessage[];
  totalDuration: number;
  totalDistance: number;
  updatedSpots: ExtendSpotType[];
  updatedDeparture: ExtendPlanLocationType;
  updatedDestination: ExtendPlanLocationType;
}> {
  const updatedDeparture: ExtendPlanLocationType = {
    ...params.departure,
    transportMethodId: 0,
    transportMethod: 'DEFAULT',
    nearestStation: params.departure.nearestStation
      ? {
          ...params.departure.nearestStation,
        }
      : params.departure.nearestStation,
  };
  const updatedDestination: ExtendPlanLocationType = {
    ...params.destination,
    travelTime: 0,
    transportMethodId: 0,
    transportMethod: 'DEFAULT',
    nearestStation: params.destination.nearestStation
      ? {
          ...params.destination.nearestStation,
        }
      : params.destination.nearestStation,
  };

  // スポットをorderでソートする
  const plannedSpots = [...params.spots].sort((a, b) => a.order - b.order);
  const updatedSpots: ExtendSpotType[] = plannedSpots.map((spot) => ({ ...spot }));
  const routes: RouteInfo[] = [];
  const messages: PlanningMessage[] = [];
  let currentMinutes = timeToMinutes(params.departure.time ?? DEFAULT_DEPARTURE_TIME);

  for (let index = 0; plannedSpots.length > 0 && index <= plannedSpots.length; index++) {
    const fromSpot = index > 0 ? updatedSpots[index - 1] : undefined;
    const toSpot = index < plannedSpots.length ? updatedSpots[index] : undefined;

    // 出発側がスポットなら、滞在時間を現在時刻に加算する
    if (fromSpot) {
      fromSpot.stayStart = minutesToTime(currentMinutes);
      fromSpot.stayEnd = minutesToTime(currentMinutes + fromSpot.stayDuration);
      currentMinutes += fromSpot.stayDuration;
    }

    const segmentKey = buildPlanningSegmentKey(fromSpot?.id, toSpot?.id);
    const fromNode: SegmentNode = fromSpot
      ? fromSpot
      : {
          name: DEPARTURE_NAME,
          latitude: params.departure.latitude,
          longitude: params.departure.longitude,
          nearestStation: params.departure.nearestStation,
        };
    const toNode: SegmentNode = toSpot
      ? toSpot
      : {
          name: DESTINATION_NAME,
          latitude: params.destination.latitude,
          longitude: params.destination.longitude,
          nearestStation: params.destination.nearestStation,
        };

    const segment = await planSegment({
      segmentKey,
      from: fromNode,
      to: toNode,
      currentMinutes,
      transportMethodIds: params.transportMethodIds,
      preferredMethodId: params.preferredTransportMethodIds?.[segmentKey],
      preferredDepartureTime: params.preferredDepartureTimes?.[segmentKey],
    });
    messages.push(...segment.messages);

    // 移動時間・移動手段は区間の出発側ノードに書き戻す
    const selectedMethodId = segment.routeResult.selectedRoute.transportMethodId;
    const fromTarget: ExtendSpotType | ExtendPlanLocationType = fromSpot ?? updatedDeparture;
    fromTarget.travelTime = segment.travelMinutes;
    fromTarget.transportMethodId = selectedMethodId;
    fromTarget.transportMethod = getTravelMethodName(selectedMethodId);
    // 発車時間候補（scheduledDepartureTimes）はユーザーの入力のまま残し、計算結果だけを書き戻す
    if (segment.stationSegment && fromTarget.nearestStation) {
      fromTarget.nearestStation = {
        ...fromTarget.nearestStation,
        transitTime: segment.stationSegment.transitTime,
        waitingTime: segment.stationSegment.waitingTime,
        scheduledDepartureTime: segment.stationSegment.scheduledDepartureTime,
      };
    }

    currentMinutes += segment.travelMinutes;

    const isStationRoute = isStationTransportMethod(selectedMethodId);
    routes.push(
      buildRouteInfo({
        fromSpotId: fromSpot?.id ?? 'departure',
        toSpotId: toSpot?.id ?? 'destination',
        fromType: fromSpot ? 'SPOT' : 'DEPARTURE',
        toType: toSpot ? 'SPOT' : 'DESTINATION',
        routeType: isStationRoute
          ? 'TO_STATION'
          : !fromSpot
            ? 'DEPARTURE_TO_SPOT'
            : !toSpot
              ? 'SPOT_TO_DESTINATION'
              : 'SPOT_TO_SPOT',
        routeResult: segment.routeResult,
      }),
    );
  }

  const totalDuration = routes.reduce((sum, route) => sum + route.duration, 0);
  const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0);

  return {
    routes,
    arrivalTime: minutesToTime(currentMinutes),
    arrivalMinutes: currentMinutes,
    messages,
    totalDuration,
    totalDistance,
    updatedSpots,
    updatedDeparture,
    updatedDestination,
  };
}

export function getPlanningMessagePriority(message: PlanningMessage): number {
  const segmentType = message.segmentKey.includes(':') ? message.segmentKey.split(':')[0] : message.segmentKey;
  return PLANNING_MESSAGE_PRIORITY[segmentType] ?? 99;
}

/**
 * プランニングメッセージを画面設計書の優先度順に並べ替える。
 * @param messages 並べ替え対象のメッセージ一覧
 * @returns 優先度順に並べ替えたメッセージ一覧
 */
export function sortPlanningMessages(messages: PlanningMessage[]): PlanningMessage[] {
  return [...messages].sort((left, right) => getPlanningMessagePriority(left) - getPlanningMessagePriority(right));
}

/**
 * プランニング結果に保存を止めるエラー（23:59 超過など）があるかを判定する。
 * @param result プランニング結果
 * @returns エラーレベルのメッセージが1件でもあれば true
 */
export function hasPlanningError(result?: PlanningResult | null): boolean {
  return !!result?.messages?.some((message) => message.level === 'ERROR');
}

/**
 * 再プランニング時に優先手段として渡せる移動手段かを判定する。
 * @param methodId 前回の移動手段ID
 * @param transportMethodIds プランで選んだ移動手段
 * @param hasBothStations 区間の両端に最寄駅があるか
 */
function isUsablePreferredMethod(
  methodId: number | undefined,
  transportMethodIds: number[],
  hasBothStations: boolean,
): methodId is number {
  if (!methodId) return false; // 0(DEFAULT) や未設定は指定なし
  if (isStationTransportMethod(methodId)) return hasBothStations;
  return transportMethodIds.includes(methodId);
}

/**
 * 再プランニング時に executePlanning へ渡す、区間ごとの優先手段と発車時間を作る。
 * ルール:
 * 1. 前回結果があるときは、出発側と到着側の組み合わせが同じ区間だけ前回の手段を引き継ぐ（並び替えた区間は自動選択）。
 *    前回結果が無いとき（保存済みプランを開いた直後など）は、ノードの移動手段を使う。
 * 2. プランの移動手段に含まれない手段、両端に最寄駅が無い区間の最寄駅経由、0 や未設定は渡さない。
 * 3. 前回は最寄駅経由の候補が無く、今回は両端に最寄駅がある区間は渡さない（最寄駅経由が自動で選ばれる）。
 * @returns 区間キーごとの優先移動手段IDと優先発車時間
 */
export function buildPreferredSelections(params: {
  spots: ExtendSpotType[];
  departure: ExtendPlanLocationType;
  destination: ExtendPlanLocationType;
  previousResult?: PlanningResult | null;
  transportMethodIds: number[];
}): {
  preferredTransportMethodIds: Record<string, number>;
  preferredDepartureTimes: Record<string, string>;
} {
  const preferredTransportMethodIds: Record<string, number> = {};
  const preferredDepartureTimes: Record<string, string> = {};
  const spots = [...params.spots].sort((a, b) => a.order - b.order);

  for (let index = 0; spots.length > 0 && index <= spots.length; index++) {
    const fromSpot = index > 0 ? spots[index - 1] : undefined;
    const toSpot = index < spots.length ? spots[index] : undefined;
    const fromNode = fromSpot ?? params.departure;
    const toNode = toSpot ?? params.destination;
    const hasBothStations = !!fromNode.nearestStation && !!toNode.nearestStation;

    let methodId: number | undefined;
    if (params.previousResult) {
      const fromSpotId = fromSpot?.id ?? 'departure';
      const toSpotId = toSpot?.id ?? 'destination';
      const previousRoute = params.previousResult.routes.find(
        (route) => route.fromSpotId === fromSpotId && route.toSpotId === toSpotId,
      );
      if (!previousRoute) continue;
      const hadStationRoute =
        isStationTransportMethod(previousRoute.transportMethodId) ||
        previousRoute.alternativeRoutes.some((route) => isStationTransportMethod(route.transportMethodId));
      if (!hadStationRoute && hasBothStations) continue;
      methodId = previousRoute.transportMethodId;
    } else {
      methodId = fromNode.transportMethodId;
    }

    if (!isUsablePreferredMethod(methodId, params.transportMethodIds, hasBothStations)) continue;

    const segmentKey = buildPlanningSegmentKey(fromSpot?.id, toSpot?.id);
    preferredTransportMethodIds[segmentKey] = methodId;

    // 最寄駅の発車時間は区間の出発側ノードが持っている
    const departureTime = fromNode.nearestStation?.scheduledDepartureTime;
    if (isStationTransportMethod(methodId) && departureTime) {
      preferredDepartureTimes[segmentKey] = departureTime;
    }
  }

  return { preferredTransportMethodIds, preferredDepartureTimes };
}

/**
 * メインプランニング関数
 */
export async function executePlanning(params: PlanningParams): Promise<PlanningResult> {
  const { departure, destination } = params;
  const departureTime = departure.time || '';
  const arrivalTime = destination.time || '';

  // 出発時間から順方向に計算
  const forwardResult = await runForwardPlanning(params);
  const arrivalMinutes = forwardResult.arrivalMinutes;
  const targetArrivalMinutes = timeToMinutes(arrivalTime);
  let extraTimeMessage: string | undefined;

  // 時刻は通算分で比較する（日付を跨いだ到着も超過として扱う）
  const isDayOverflow = arrivalMinutes > DAY_END_MINUTES;
  const isOverTime = isDayOverflow || (isValidTimeFormat(arrivalTime) && arrivalMinutes > targetArrivalMinutes);
  const arrivalWarning =
    isOverTime && arrivalTime ? createArrivalWarning(departureTime, targetArrivalMinutes, arrivalMinutes) : null;
  const overTimeMinutes = isOverTime ? arrivalMinutes - targetArrivalMinutes : 0;

  // 余裕時間を計算（到着時間より早く着く場合）
  const extraTimeMinutes = !isOverTime ? targetArrivalMinutes - arrivalMinutes : 0;

  if (isDayOverflow) {
    // 時刻として不整合になるため、到着時間超過ではなくエラーとして扱う（保存もできない）
    forwardResult.messages.push({
      level: 'ERROR',
      message: '到着時刻が23:59を超えています。出発時間を早めるか、スポットや滞在時間を見直してください。',
      segmentKey: PLANNING_MESSAGE_SEGMENT.DAY_OVERFLOW,
    });
  } else if (isOverTime) {
    // 到着時間超過の警告を追加
    forwardResult.messages.push({
      level: 'WARNING',
      message: buildOverTimeSuggestionMessage(overTimeMinutes),
      segmentKey: PLANNING_MESSAGE_SEGMENT.OVER_TIME,
    });
  }

  // 余裕時間がある場合の提案を生成
  if (extraTimeMinutes >= 90) {
    extraTimeMessage = '新しいスポットを追加して、より充実した旅程にしませんか';
    forwardResult.messages.push({
      level: 'INFO',
      message: extraTimeMessage,
      segmentKey: PLANNING_MESSAGE_SEGMENT.EXTRA_TIME,
    });
  } else if (extraTimeMinutes >= 60) {
    const perSpotExtraMinutes = Math.floor(extraTimeMinutes / Math.max(params.spots.length, 1));
    extraTimeMessage = `各スポットで約${perSpotExtraMinutes}分ずつ長く滞在できます`;
    forwardResult.messages.push({
      level: 'INFO',
      message: extraTimeMessage,
      segmentKey: PLANNING_MESSAGE_SEGMENT.EXTRA_TIME,
    });
  } else if (extraTimeMinutes >= 30) {
    extraTimeMessage = 'お気に入りのスポットでもう少しゆっくり過ごしてみては？';
    forwardResult.messages.push({
      level: 'INFO',
      message: extraTimeMessage,
      segmentKey: PLANNING_MESSAGE_SEGMENT.EXTRA_TIME,
    });
  }

  const result = {
    routes: forwardResult.routes,
    totalDistance: forwardResult.totalDistance,
    totalDuration: forwardResult.totalDuration,
    departureTime,
    arrivalTime: forwardResult.arrivalTime,
    isOverTime,
    overTimeMinutes: overTimeMinutes,
    arrivalWarning,
    extraTimeMinutes: extraTimeMinutes,
    extraTimeMessage,
    messages: forwardResult.messages,
    updatedSpots: forwardResult.updatedSpots,
    updatedDeparture: forwardResult.updatedDeparture,
    updatedDestination: forwardResult.updatedDestination,
  };

  result.messages = sortPlanningMessages(result.messages);

  return result;
}
