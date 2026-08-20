import { TransportMethodType } from '@shared/transports/types';

import {
  TravelPlanType,
  TravelModeType,
  ExtendSpotType,
  ExtendPlanLocationType,
  ExtendNearestStationType,
} from '@/types/plan';
import {
  DEFAULT_ARRIVAL_TIME,
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

export type PlanningMessageLevel = 'INFO' | 'WARNING';

export type PlanningMessage = {
  level: PlanningMessageLevel;
  segmentKey: string;
  message: string;
};

export type PlanningComputationResult = {
  isValid: boolean;
  // mode: PlanningMode;
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
  duration: number; // 秒
  durationText: string; // 表示用（例: "15分"）
  distanceText: string; // 表示用（例: "1.2km"）
  waitingMinutes?: number; // TRANSITの場合の待ち時間（分）
  polyline?: string; // Google Maps Polyline
  useNearestStation?: boolean; // 最寄駅を経由するか
  nearestStationId?: number; // 経由する最寄駅のID
  /** 代替ルート情報 - プレビュー画面での切り替え用 */
  alternativeRoutes?: AlternativeRouteInfo[];
};

/**
 * 代替ルート情報（選択されなかった移動手段のルート）
 */
export type AlternativeRouteInfo = {
  transportMethodId: number;
  transportMethod: TransportMethodType;
  duration: number; // 秒
  distance: number; // メートル
  durationText: string; // 表示用（例: 「15分」）
  distanceText: string; // 表示用（例: 「1.2km」）
  /** 最寄駅経由ルートの場合true（徒歩→電車→徒歩をまとめた1候補） */
  isStationRoute?: boolean;
};

export type DistanceInfoInput = DirectDistanceInfoInput | StationDistanceInfoInput;

export type CandidateSelectionState = {
  selectedTransport?: TransportMethodType;
  selectedDepartureTime?: string;
  [key: string]: unknown;
};

type NearestStationDurationInfo = {
  walkToStation: number;
  transitMinutes: number;
  walkFromStation: number;
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

function calculatePathDistanceMeters(path: google.maps.LatLngLiteral[]): number {
  if (!path || path.length < 2) return 0;

  let totalDistance = 0;

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const latitudeDelta = ((to.lat - from.lat) * Math.PI) / 180;
    const longitudeDelta = ((to.lng - from.lng) * Math.PI) / 180;
    const fromLatRad = (from.lat * Math.PI) / 180;
    const toLatRad = (to.lat * Math.PI) / 180;

    const haversineA =
      Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
      Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
    const haversineC = 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));

    totalDistance += 6371000 * haversineC;
  }

  return Math.round(totalDistance);
}

function getRouteDistanceMeters(route: RouteResult & { transportMethodId: number }): number {
  return route.distance || calculatePathDistanceMeters(route.path);
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

function formatDurationAsHourMinute(minutes: number): string {
  const safeMinutes = Math.max(Math.floor(minutes), 0);
  const hours = Math.floor(safeMinutes / 60);
  const remains = safeMinutes % 60;
  return minutes < 60 ? `${remains}分` : `${hours}時間${remains}分`;
}

/**
 * 長距離メッセージ作成
 * @param messages - メッセージ一覧
 * @param segmentKey - 識別用セグメントキー（例: "SPOT1_TO_SPOT2"）
 * @param durationSec - 移動時間（秒単位）
 * @param distanceM - 移動距離（メートル単位）
 * @param originName - 出発地の名称（例: "スポットA"）
 * @param targetName - 到着地の名称（例: "スポットB"）
 * @returns
 */
export function pushLongWalkMessage(
  messages: PlanningMessage[],
  segmentKey: string,
  durationSec: number,
  distanceM: number,
  originName: string,
  targetName: string,
): void {
  if (distanceM < THRESHOLD_FOR_DISTANCE) return;
  const minutes = Math.max(durationSec, 0);
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
  destinationTime: string,
  arrivalTime: string,
): ArrivalWarning | null {
  const arrivalMinutes = timeToMinutes(arrivalTime);
  const deadlineMinutes = timeToMinutes(destinationTime);
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
    case 5:
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
    case 5:
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
  return methodId === 4 || methodId === 5;
}

/**
 * 再プランニング時に直接移動候補として優先採用できる移動手段IDを返す。
 * 公共交通手段が選ばれている場合は、最寄駅経由の判定へ委ねるため未設定扱いにする。
 * @param methodId 現在選択中の移動手段ID
 * @returns 直接移動候補として使う移動手段ID
 */
function getPreferredDirectTransportMethodId(methodId?: number): number | undefined {
  if (!methodId || isStationTransportMethod(methodId)) return undefined;
  return methodId;
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
  travelMode: TravelModeType;
};

/**
 * ルート選択結果（選択ルート + 代替ルート）
 */
type RouteSelectionResult = {
  /** 選択されたルート */
  selectedRoute: RouteResult & { transportMethodId: number };
  /** 代替ルート一覧（選択されなかったルート） */
  alternativeRoutes: Array<RouteResult & { transportMethodId: number }>;
  /** ルート取得失敗した交通手段 */
  failedRoutes?: RouteFailureInfo[];
  /** 徒歩でフォールバックしたか */
  isFallbackToWalking?: boolean;
  /** 選択された最寄駅のルート */
  selectedNearestStationRoute?: Array<RouteResult & { transportMethodId: number }>;
};

/**
 * 2点間のルートを取得（複数の移動手段で比較し、最適なものを選択）
 * 代替ルートも含めて返却
 *
 * @param from 出発地点
 * @param to 到着地点
 * @param transportMethodIds 利用可能な移動手段のID配列
 * @param preferredTransportMethodId 優先的に使用する移動手段ID(transportMethodIdsにも含まれていること)
 */
export async function getOptimalRouteWithAlternatives(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  transportMethodIds: number[],
  useNearestStation: boolean = false,
  preferredTransportMethodId?: number,
  originNearestStation?: ExtendNearestStationType,
  destinationNearestStation?: ExtendNearestStationType,
): Promise<RouteSelectionResult> {
  // 利用可能な移動手段でルートを取得
  const routes: Array<RouteResult & { transportMethodId: number }> = [];
  // 最寄駅用のルート情報を格納する配列
  let mainRoute: Array<RouteResult & { transportMethodId: number }> = [];
  // 失敗した移動手段を記録
  const failedRoutes: RouteFailureInfo[] = [];

  // preferredと現在プランニングで選んでいる交通手段が被っている場合、重複するので除去する
  const uniqueTransportMethodIds = Array.from(new Set(transportMethodIds));

  for (const methodId of uniqueTransportMethodIds) {
    const mode = getTravelModeFromId(methodId);
    // TRANSITは除外
    if (mode === 'TRANSIT') continue;

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

  // ルートが取得できなかった場合は徒歩でフォールバック
  if (routes.length === 0) {
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
      failedRoutes.push({
        transportMethodId: 1,
        reason: error instanceof Error ? error.message : '徒歩ルートも取得できませんでした',
        failed: true,
      });
      // 空のルートを返す（エラーとして処理）
      return {
        selectedRoute: {
          path: [from, to],
          distance: 0,
          duration: 0,
          travelMode: 'WALKING',
          transportMethodId: 1,
        },
        alternativeRoutes: [],
        failedRoutes,
        isFallbackToWalking: true,
      };
    }
  }

  const sortedRoutes = [...routes].sort(
    (left, right) =>
      getTransportMethodPriority(right.transportMethodId) - getTransportMethodPriority(left.transportMethodId),
  );

  if (useNearestStation && originNearestStation && destinationNearestStation) {
    mainRoute = buildNearestStationRouteInfo(originNearestStation, destinationNearestStation, from, to);
  }

  let selectedRoute: RouteResult & { transportMethodId: number };

  if (useNearestStation && preferredTransportMethodId !== undefined) {
    selectedRoute =
      sortedRoutes.find((route) => route.transportMethodId === preferredTransportMethodId) ?? sortedRoutes[0];
  } else if (useNearestStation && preferredTransportMethodId === undefined) {
    selectedRoute = {
      path: [],
      distance: 0,
      duration: 0,
      travelMode: 'TRANSIT',
      transportMethodId: 4,
    }; // 仮の最寄駅ルート
  } else if (!useNearestStation && preferredTransportMethodId !== undefined) {
    selectedRoute =
      sortedRoutes.find((route) => route.transportMethodId === preferredTransportMethodId) ?? sortedRoutes[0];
  } else {
    selectedRoute = sortedRoutes[0];
  }
  const alternativeRoutes = [selectedRoute, ...sortedRoutes.filter((route) => route !== selectedRoute)];

  return {
    selectedRoute,
    alternativeRoutes,
    failedRoutes: failedRoutes.length > 0 ? failedRoutes : undefined,
    isFallbackToWalking: false,
    selectedNearestStationRoute: mainRoute.length > 0 ? mainRoute : undefined,
  };
}

/**
 * 最寄駅経由の移動時間を計算する
 */
function calculateTotalNearestStationDuration(
  originNearestStation: ExtendNearestStationType,
  destinationNearestStation: ExtendNearestStationType,
): NearestStationDurationInfo {
  const walkToStation = Math.max(originNearestStation.walkingTime ?? 0, 0);
  const transitMinutes = Math.max(originNearestStation.transitTime ?? 0, 0);
  const walkFromStation = Math.max(destinationNearestStation.walkingTime ?? 0, 0);

  return {
    walkToStation,
    transitMinutes,
    walkFromStation,
  };
}

/**
 * 最寄り駅経由を想定したルート情報を作成する
 * @param origin 起点となる場所
 * @param destination 目的地となる場所
 * @returns
 */
function buildNearestStationRouteInfo(
  originNearestStation: ExtendNearestStationType,
  destinationNearestStation: ExtendNearestStationType,
  originCoord: { lat: number; lng: number },
  destinationCoord: { lat: number; lng: number },
): Array<RouteResult & { transportMethodId: number }> {
  if (!originNearestStation || !destinationNearestStation) {
    throw new Error('最寄駅情報が不足しています。');
  }
  const { walkToStation, transitMinutes, walkFromStation } = calculateTotalNearestStationDuration(
    originNearestStation,
    destinationNearestStation,
  );
  const originStationCoord = {
    lat: originNearestStation.latitude,
    lng: originNearestStation.longitude,
  };

  const destinationStationCoord = {
    lat: destinationNearestStation.latitude,
    lng: destinationNearestStation.longitude,
  };

  // 出発地から最寄駅
  const routeToStation: RouteResult & { transportMethodId: number } = {
    path: [
      { lat: originCoord.lat, lng: originCoord.lng },
      { lat: originStationCoord.lat, lng: originStationCoord.lng },
    ],
    distance: 0,
    duration: walkToStation,
    travelMode: 'WALKING',
    transportMethodId: 1,
  };

  // 最寄駅間
  const transitRoute: RouteResult & { transportMethodId: number } = {
    path: [
      { lat: originStationCoord.lat, lng: originStationCoord.lng },
      { lat: destinationStationCoord.lat, lng: destinationStationCoord.lng },
    ],
    distance: 0,
    duration: transitMinutes,
    travelMode: 'TRANSIT',
    transportMethodId: 4,
  };

  // 最寄り駅から目的地
  const routeFromStation: RouteResult & { transportMethodId: number } = {
    path: [
      { lat: destinationStationCoord.lat, lng: destinationStationCoord.lng },
      { lat: destinationCoord.lat, lng: destinationCoord.lng },
    ],
    distance: 0,
    duration: walkFromStation,
    travelMode: 'WALKING',
    transportMethodId: 1,
  };
  return [routeToStation, transitRoute, routeFromStation];
}

/**
 * 出発時間からプランニングするアルゴリズム
 * 処理概要
 * 1. 出発地から最初のスポットへのルートと時間を計算（最寄駅経由の有無を考慮）
 * 2. 各スポット間のルートと時間を順番に計算（最寄駅経由の有無を考慮）
 * 3. 最後のスポットから目的地へのルートと時間を計算（最寄駅経由の有無を考慮）
 * 4. 各スポットの滞在時間を加算して、最終的な到着時間を算出
 * ルート選択ルール -
 * 1. 最適ルートの選択は、スポットの距離と時間を考慮して、最寄駅を考慮した経路、徒歩、自転車、車の順で優先する。
 * 2. 選択されなかったルートはプレビュー画面での切り替えように保持する。
 * 3. 最寄駅を経由する場合は、駅までの徒歩時間、駅での待ち時間、乗車時間、駅からの徒歩時間を考慮してルートと時間を計算する。
 * @param params PlanningParams
 * @returns ルート情報、到着時間、警告メッセージ、総移動時間、総移動距離
 */
async function runForwardPlanning(params: PlanningParams): Promise<{
  routes: RouteInfo[];
  arrivalTime: string;
  messages: PlanningMessage[];
  totalDuration: number;
  totalDistance: number;
  updatedSpots: ExtendSpotType[];
  updatedDeparture: ExtendPlanLocationType;
  updatedDestination: ExtendPlanLocationType;
}> {
  const updatedDeparture: ExtendPlanLocationType = {
    ...params.departure,
    nearestStation: params.departure.nearestStation
      ? {
          ...params.departure.nearestStation,
        }
      : params.departure.nearestStation,
  };
  const updatedDestination: ExtendPlanLocationType = {
    ...params.destination,
    nearestStation: params.destination.nearestStation
      ? {
          ...params.destination.nearestStation,
        }
      : params.destination.nearestStation,
  };

  const updatedSpots = [];
  const routes: RouteInfo[] = [];
  // スポットをorderでソートする
  const plannedSpots = [...params.spots].sort((a, b) => a.order - b.order);
  const messages: PlanningMessage[] = [];
  let currentPlanningTime = timeToMinutes(params.departure.time ?? DEFAULT_DEPARTURE_TIME);
  let routeSegments: Array<{
    routes: Array<RouteResult & { transportMethodId: number }>;
    via?: 'station';
    isTransit?: boolean;
    alternativeRoutes?: Array<RouteResult & { transportMethodId: number }>;
    failedRoutes?: RouteFailureInfo[];
    isFallbackToWalking?: boolean;
  }> = [];
  const firstSpot = plannedSpots[0];
  let totalDuration = 0;
  let useNearestStation = false;
  const departureCoord = { lat: params.departure.latitude, lng: params.departure.longitude };
  const firstSegmentKey = 'DEPARTURE_TO_FIRST_SPOT';
  const preferredFirstSegmentMethodId = params.preferredTransportMethodIds?.[firstSegmentKey];
  const preferredFirstSegmentDepartureTime = params.preferredDepartureTimes?.[firstSegmentKey];

  if (params.departure.nearestStation && firstSpot.nearestStation) {
    useNearestStation = true;
    const { walkToStation, transitMinutes, walkFromStation } = calculateTotalNearestStationDuration(
      params.departure.nearestStation,
      firstSpot.nearestStation,
    );

    // 最寄駅到着時間
    const stationArrivalTime = currentPlanningTime + walkToStation;
    // 出発地の発車時間候補
    const departureCandidates =
      params.departure.nearestStation.scheduledDepartureTimes &&
      params.departure.nearestStation.scheduledDepartureTimes.length > 0
        ? params.departure.nearestStation.scheduledDepartureTimes
        : [preferredFirstSegmentDepartureTime ?? ''];
    const candidatesResult = selectDepartureCandidate(stationArrivalTime, departureCandidates);
    const selectedDepartureMinutes = timeToMinutes(candidatesResult.selectedTime);
    const waitingMinutes = Math.max(selectedDepartureMinutes - stationArrivalTime, 0);
    const segmentKey = firstSegmentKey;

    totalDuration = walkToStation + waitingMinutes + transitMinutes + walkFromStation;

    if (updatedDeparture.nearestStation) {
      updatedDeparture.nearestStation = {
        ...updatedDeparture.nearestStation,
        transitTime: transitMinutes,
        waitingTime: waitingMinutes,
        scheduledDepartureTime: candidatesResult.selectedTime,
        scheduledDepartureTimes: departureCandidates,
      };
    }

    // メッセージを格納
    if (candidatesResult.level && candidatesResult.message) {
      messages.push({
        level: candidatesResult.level,
        segmentKey: buildSegmentKey(
          candidatesResult.segmentType ?? PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED,
          segmentKey,
        ),
        message: candidatesResult.message,
      });
    }
  }
  // 最寄駅を介さないあるいは最寄駅情報がない場合のルートと時間を計算
  const routeResult = await getOptimalRouteWithAlternatives(
    departureCoord,
    {
      lat: firstSpot.latitude,
      lng: firstSpot.longitude,
    },
    [...params.transportMethodIds, preferredFirstSegmentMethodId ?? 1],
    useNearestStation,
    getPreferredDirectTransportMethodId(preferredFirstSegmentMethodId),
  );
  pushRouteFailureMessages(messages, firstSegmentKey, routeResult.failedRoutes, routeResult.isFallbackToWalking);
  // 出発地から最初のスポットまでの移動時間を更新
  updatedDeparture.travelTime = useNearestStation ? totalDuration : routeResult.selectedRoute.duration;
  updatedDeparture.transportMethodId = routeResult.selectedRoute.transportMethodId;
  updatedDeparture.transportMethod = getTravelMethodName(updatedDeparture.transportMethodId);

  currentPlanningTime += updatedDeparture.travelTime;
  // 最寄駅のルートがある場合は、徒歩→乗車→徒歩のルートを優先して追加し、最寄駅を介さないルートは代替ルートとして保持する
  routeSegments.push({
    routes: [routeResult.selectedRoute],
    via: useNearestStation ? 'station' : undefined,
    alternativeRoutes: useNearestStation
      ? [
          ...routeResult.alternativeRoutes,
          // 最寄駅経由ルートを1候補にまとめて追加（切り替え用）
          {
            path: [] as google.maps.LatLngLiteral[],
            distance: 0,
            duration: updatedDeparture.travelTime,
            travelMode: 'TRANSIT' as const,
            transportMethodId: 4,
            waitingMinutes: routeResult.selectedRoute.waitingMinutes ?? 0,
          },
        ]
      : routeResult.alternativeRoutes,
    failedRoutes: routeResult.failedRoutes,
    isFallbackToWalking: routeResult.isFallbackToWalking,
  });

  for (const segment of routeSegments) {
    let durationSec: number = 0;
    let distanceM: number = 0;

    if (segment.via === 'station') {
      for (const route of segment.routes) {
        durationSec += route.duration;
        distanceM += getRouteDistanceMeters(route);
      }
    } else {
      durationSec = segment.routes[0].duration;
      distanceM = getRouteDistanceMeters(segment.routes[0]);
      // 移動手段が徒歩で1.5km以上離れている場合は、警告メッセージを格納する
      if (segment.routes[0].transportMethodId === 1)
        pushLongWalkMessage(
          messages,
          'DEPARTURE_TO_FIRST_SPOT',
          durationSec,
          distanceM,
          DEPARTURE_NAME,
          firstSpot.name,
        );
    }

    // 代替ルート情報を変換
    const alternativeRoutes = segment.alternativeRoutes?.map((alt) => ({
      transportMethodId: alt.transportMethodId,
      transportMethod: getTravelMethodName(alt.transportMethodId),
      duration: alt.duration,
      distance: getRouteDistanceMeters(alt),
      durationText: `${alt.duration / 60}分`,
      distanceText: `${alt.distance}m`,
      waitingMinutes: alt.waitingMinutes,
      // 最寄駅経由（transportMethodId=4）の場合はisStationRoute=trueで表示を分ける
      isStationRoute: alt.transportMethodId === 4,
    }));
    routes.push({
      id: `route-info-${routes.length}`,
      fromSpotId: 'departure',
      toSpotId: firstSpot.id,
      fromType: 'DEPARTURE',
      toType: 'SPOT',
      routeType: useNearestStation ? 'TO_STATION' : 'DEPARTURE_TO_SPOT',
      // 最寄駅経由の場合はTRANSIT(id=4)として扱い、移動手段切り替え候補と一致させる
      transportMethod: useNearestStation
        ? 'TRANSIT'
        : segment.isTransit
          ? 'TRANSIT'
          : getTravelMethodName(segment.routes[0].transportMethodId),
      transportMethodId: useNearestStation ? 4 : segment.routes[0].transportMethodId,
      distance: distanceM,
      duration: durationSec,
      durationText: `${durationSec / 60}分`,
      distanceText: `${segment.routes[0].distance}m`,
      waitingMinutes: segment.routes[0].waitingMinutes,
      polyline: encodePolyline(segment.routes[0].path),
      useNearestStation: useNearestStation,
      alternativeRoutes,
    });
  }

  // スポット間での時間調整
  for (let i = 0; i < plannedSpots.length; i++) {
    useNearestStation = false;
    const currentSpot = plannedSpots[i];
    const stayStart = minutesToTime(currentPlanningTime);
    const stayEnd = minutesToTime(currentPlanningTime + currentSpot.stayDuration);
    let updatedCurrentSpot: ExtendSpotType = {
      ...currentSpot,
      stayStart,
      stayEnd,
    };
    // 滞在時間
    const stayDuration = currentSpot.stayDuration;

    // 滞在時間を現在時刻に加算
    currentPlanningTime += stayDuration;
    routeSegments = [];
    if (i < plannedSpots.length - 1) {
      totalDuration = 0;
      const nextSpot = plannedSpots[i + 1];
      const segmentKey = `SPOT_${currentSpot.id}_TO_${nextSpot.id}`;
      const preferredSpotToSpotMethodId = params.preferredTransportMethodIds?.[segmentKey];
      const preferredSpotToSpotDepartureTime = params.preferredDepartureTimes?.[segmentKey];
      if (currentSpot.nearestStation && nextSpot.nearestStation) {
        useNearestStation = true;
        const { walkToStation, transitMinutes, walkFromStation } = calculateTotalNearestStationDuration(
          currentSpot.nearestStation,
          nextSpot.nearestStation,
        );
        // 駅到着時間 = 現在の時間 + 駅までの徒歩時間
        const stationArrival = currentPlanningTime + walkToStation;
        // スポット間の最寄駅
        const candidates =
          currentSpot.nearestStation.scheduledDepartureTimes &&
          currentSpot.nearestStation.scheduledDepartureTimes.length > 0
            ? currentSpot.nearestStation.scheduledDepartureTimes
            : [preferredSpotToSpotDepartureTime ?? ''];
        // 発車時間候補から、駅到着時間を考慮して有効な発車時間を選択する
        const selectedCandidates = selectDepartureCandidate(stationArrival, candidates);
        const selectedMinutes = timeToMinutes(selectedCandidates.selectedTime);
        const waitingMinutes = Math.max(selectedMinutes - stationArrival, 0);
        totalDuration = walkToStation + waitingMinutes + transitMinutes + walkFromStation;

        if (selectedCandidates.level && selectedCandidates.message) {
          messages.push({
            level: selectedCandidates.level,
            segmentKey: buildSegmentKey(
              selectedCandidates.segmentType ?? PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED,
              segmentKey,
            ),
            message: selectedCandidates.message,
          });
        }

        updatedCurrentSpot = {
          ...updatedCurrentSpot,
          nearestStation: {
            ...updatedCurrentSpot.nearestStation,
            name: currentSpot.nearestStation.name,
            latitude: currentSpot.nearestStation.latitude,
            placeId: currentSpot.nearestStation.placeId,
            stationType: currentSpot.nearestStation.stationType,
            longitude: currentSpot.nearestStation.longitude,
            spotId: currentSpot.nearestStation.spotId,
            transitTime: transitMinutes,
            waitingTime: waitingMinutes,
            scheduledDepartureTime: selectedCandidates.selectedTime,
            scheduledDepartureTimes: candidates,
          },
        };
      }

      const preferredDirectTransportMethodId = getPreferredDirectTransportMethodId(preferredSpotToSpotMethodId);

      const routeResult = await getOptimalRouteWithAlternatives(
        {
          lat: currentSpot.latitude,
          lng: currentSpot.longitude,
        },
        {
          lat: nextSpot.latitude,
          lng: nextSpot.longitude,
        },
        [...params.transportMethodIds, preferredSpotToSpotMethodId ?? 1],
        useNearestStation,
        preferredDirectTransportMethodId,
      );
      pushRouteFailureMessages(messages, segmentKey, routeResult.failedRoutes, routeResult.isFallbackToWalking);

      updatedCurrentSpot.travelTime = useNearestStation ? totalDuration : routeResult.selectedRoute.duration;
      updatedCurrentSpot.transportMethodId = routeResult.selectedRoute.transportMethodId;
      updatedCurrentSpot.transportMethod = getTravelMethodName(updatedCurrentSpot.transportMethodId);
      currentPlanningTime += updatedCurrentSpot.travelTime;

      routeSegments.push({
        routes: [routeResult.selectedRoute],
        via: useNearestStation ? 'station' : undefined,
        alternativeRoutes: useNearestStation
          ? [
              ...routeResult.alternativeRoutes,
              // 最寄駅経由ルートを1候補にまとめて追加（切り替え用）
              {
                path: [] as google.maps.LatLngLiteral[],
                distance: 0,
                duration: updatedCurrentSpot.travelTime,
                travelMode: 'TRANSIT' as const,
                waitingMinutes: routeResult.selectedRoute.waitingMinutes ?? 0,
                transportMethodId: 4,
              },
            ]
          : routeResult.alternativeRoutes, // 最寄駅を使わない場合は直接ルートの代替のみ
        failedRoutes: routeResult.failedRoutes,
        isFallbackToWalking: routeResult.isFallbackToWalking,
      });

      for (const segment of routeSegments) {
        let durationSec: number = 0;
        let distanceM: number = 0;

        if (segment.via === 'station') {
          for (const route of segment.routes) {
            durationSec += route.duration;
            distanceM += getRouteDistanceMeters(route);
          }
        } else {
          durationSec = segment.routes[0].duration;
          distanceM = getRouteDistanceMeters(segment.routes[0]);
          // 移動手段が徒歩で1.5km以上離れている場合は、警告メッセージを格納する
          if (segment.routes[0].transportMethodId === 1)
            pushLongWalkMessage(messages, segmentKey, durationSec, distanceM, currentSpot.name, nextSpot.name);
        }

        // 代替ルート情報を変換
        const alternativeRoutes = segment.alternativeRoutes?.map((alt) => ({
          transportMethodId: alt.transportMethodId,
          transportMethod: getTravelMethodName(alt.transportMethodId),
          duration: alt.duration,
          distance: getRouteDistanceMeters(alt),
          durationText: `${alt.duration / 60}分`,
          distanceText: `${alt.distance}m`,
          waitingMinutes: alt.waitingMinutes,
          // 最寄駅経由（transportMethodId=4）の場合はisStationRoute=trueで表示を分ける
          isStationRoute: alt.transportMethodId === 4,
        }));
        routes.push({
          id: `route-info-${routes.length}`,
          fromSpotId: currentSpot.id,
          toSpotId: nextSpot.id,
          fromType: 'SPOT',
          toType: 'SPOT',
          routeType: useNearestStation ? 'TO_STATION' : 'SPOT_TO_SPOT',
          // 最寄駅経由の場合はTRANSIT(id=4)として扱い、移動手段切り替え候補と一致させる
          transportMethod: useNearestStation
            ? 'TRANSIT'
            : segment.isTransit
              ? 'TRANSIT'
              : getTravelMethodName(segment.routes[0].transportMethodId),
          transportMethodId: useNearestStation ? 4 : segment.routes[0].transportMethodId,
          distance: distanceM,
          duration: durationSec,
          durationText: `${durationSec / 60}分`,
          distanceText: `${segment.routes[0].distance}m`,
          waitingMinutes: segment.routes[0].waitingMinutes,
          polyline: encodePolyline(segment.routes[0].path),
          useNearestStation: useNearestStation,
          alternativeRoutes,
        });
      }
    }

    updatedSpots.push(updatedCurrentSpot);
  }

  // 最後のスポットから目的地へのルートと時間を計算
  if (plannedSpots.length > 0) {
    useNearestStation = false;
    routeSegments = [];
    totalDuration = 0;
    const lastSpot = plannedSpots[plannedSpots.length - 1];
    const destinationCoord = { lat: params.destination.latitude, lng: params.destination.longitude };
    const lastSegmentKey = `SPOT_${lastSpot.id}_TO_DESTINATION`;
    const preferredLastSegmentMethodId = params.preferredTransportMethodIds?.[lastSegmentKey];
    const preferredLastSegmentDepartureTimes = params.preferredDepartureTimes?.[lastSegmentKey];
    if (lastSpot.nearestStation && params.destination.nearestStation) {
      useNearestStation = true;
      const { walkToStation, transitMinutes, walkFromStation } = calculateTotalNearestStationDuration(
        lastSpot.nearestStation,
        params.destination.nearestStation,
      );
      const stationArrival = currentPlanningTime + walkToStation;
      const candidates =
        params.destination.nearestStation.scheduledDepartureTimes &&
        params.destination.nearestStation.scheduledDepartureTimes?.length > 0
          ? params.destination.nearestStation.scheduledDepartureTimes
          : [preferredLastSegmentDepartureTimes ?? ''];
      const selectedCandidates = selectDepartureCandidate(stationArrival, candidates);
      const selectedMinutes = timeToMinutes(selectedCandidates.selectedTime);
      const waitingMinutes = Math.max(selectedMinutes - stationArrival, 0);
      const segmentKey = lastSegmentKey;
      totalDuration = walkToStation + waitingMinutes + transitMinutes + walkFromStation;

      if (updatedDestination.nearestStation) {
        updatedDestination.nearestStation = {
          ...updatedDestination.nearestStation,
          transitTime: 0, // 目的地なのでそれ以上の移動はないため
          waitingTime: waitingMinutes,
          scheduledDepartureTime: selectedCandidates.selectedTime,
          scheduledDepartureTimes: candidates,
        };
      }

      if (selectedCandidates.level && selectedCandidates.message) {
        messages.push({
          level: selectedCandidates.level,
          segmentKey: buildSegmentKey(
            selectedCandidates.segmentType ?? PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED,
            segmentKey,
          ),
          message: selectedCandidates.message,
        });
      }
    }
    const routeResult = await getOptimalRouteWithAlternatives(
      {
        lat: lastSpot.latitude,
        lng: lastSpot.longitude,
      },
      destinationCoord,
      [...params.transportMethodIds, preferredLastSegmentMethodId ?? 1],
      useNearestStation,
      getPreferredDirectTransportMethodId(preferredLastSegmentMethodId),
    );
    pushRouteFailureMessages(messages, lastSegmentKey, routeResult.failedRoutes, routeResult.isFallbackToWalking);

    updatedDestination.travelTime = useNearestStation ? totalDuration : routeResult.selectedRoute.duration;
    updatedDestination.transportMethodId = routeResult.selectedRoute.transportMethodId;
    updatedDestination.transportMethod = getTravelMethodName(routeResult.selectedRoute.transportMethodId);

    currentPlanningTime += updatedDestination.travelTime;

    routeSegments.push({
      routes: [routeResult.selectedRoute],
      via: useNearestStation ? 'station' : undefined,
      alternativeRoutes: useNearestStation
        ? [
            ...routeResult.alternativeRoutes,
            // 最寄駅経由ルートを1候補にまとめて追加（切り替え用）
            {
              path: [] as google.maps.LatLngLiteral[],
              distance: 0,
              duration: updatedDestination.travelTime,
              travelMode: 'TRANSIT' as const,
              waitingMinutes: routeResult.selectedRoute.waitingMinutes ?? 0,
              transportMethodId: 4,
            },
          ]
        : routeResult.alternativeRoutes, // 最寄駅を使わない場合は直接ルートの代替のみ
      failedRoutes: routeResult.failedRoutes,
      isFallbackToWalking: routeResult.isFallbackToWalking,
    });

    for (const segment of routeSegments) {
      let durationSec: number = 0;
      let distanceM: number = 0;

      if (segment.via === 'station') {
        for (const route of segment.routes) {
          durationSec += route.duration;
          distanceM += getRouteDistanceMeters(route);
        }
      } else {
        durationSec = segment.routes[0].duration;
        distanceM = getRouteDistanceMeters(segment.routes[0]);
        // 移動手段が徒歩で1.5km以上離れている場合は、警告メッセージを格納する
        if (segment.routes[0].transportMethodId === 1)
          pushLongWalkMessage(
            messages,
            `SPOT_${lastSpot.id}_TO_DESTINATION`,
            durationSec,
            distanceM,
            lastSpot.name,
            DESTINATION_NAME,
          );
      }

      // 代替ルート情報を変換
      const alternativeRoutes = segment.alternativeRoutes?.map((alt) => ({
        transportMethodId: alt.transportMethodId,
        transportMethod: getTravelMethodName(alt.transportMethodId),
        duration: alt.duration,
        distance: getRouteDistanceMeters(alt),
        durationText: `${alt.duration / 60}分`,
        distanceText: `${alt.distance}m`,
        waitingMinutes: alt.waitingMinutes,
        // 最寄駅経由（transportMethodId=4）の場合はisStationRoute=trueで表示を分ける
        isStationRoute: alt.transportMethodId === 4,
      }));
      routes.push({
        id: `route-info-${routes.length}`,
        fromSpotId: lastSpot.id,
        toSpotId: 'destination',
        fromType: 'SPOT',
        toType: 'DESTINATION',
        routeType: useNearestStation ? 'TO_STATION' : 'SPOT_TO_DESTINATION',
        // 最寄駅経由の場合はTRANSIT(id=4)として扱い、移動手段切り替え候補と一致させる
        transportMethod: useNearestStation
          ? 'TRANSIT'
          : segment.isTransit
            ? 'TRANSIT'
            : getTravelMethodName(segment.routes[0].transportMethodId),
        transportMethodId: useNearestStation ? 4 : segment.routes[0].transportMethodId,
        distance: distanceM,
        duration: durationSec,
        durationText: `${durationSec / 60}分`,
        distanceText: `${segment.routes[0].distance}m`,
        waitingMinutes: segment.routes[0].waitingMinutes,
        polyline: encodePolyline(segment.routes[0].path),
        useNearestStation: useNearestStation || segment.isTransit,
        alternativeRoutes,
      });
    }
  }
  const destinationTime = minutesToTime(currentPlanningTime);

  totalDuration = routes.reduce((sum, route) => sum + route.duration, 0);
  const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0);

  return {
    routes: routes,
    arrivalTime: destinationTime,
    messages: messages,
    totalDuration,
    totalDistance,
    updatedSpots,
    updatedDeparture,
    updatedDestination,
  };
}

async function runBackwardPlanning(params: PlanningParams): Promise<{
  routes: RouteInfo[];
  arrivalTime: string;
  departureTime: string;
  messages: PlanningMessage[];
  totalDuration: number;
  totalDistance: number;
  updatedSpots: ExtendSpotType[];
  updatedDeparture: ExtendPlanLocationType;
  updatedDestination: ExtendPlanLocationType;
}> {
  /**
   * 到着時刻から逆算する際も、前進プランニングを反復実行して候補時刻を収束させる。
   * 発車候補や待機時間の影響を forward 側の計算に寄せるための実装。
   */
  const targetArrivalTime = resolveLocationTime(params.destination.time, DEFAULT_ARRIVAL_TIME);
  const targetArrivalMinutes = timeToMinutes(targetArrivalTime);

  let estimatedDepartureTime = resolveLocationTime(params.departure.time, DEFAULT_DEPARTURE_TIME);
  let latestForwardResult: Awaited<ReturnType<typeof runForwardPlanning>> | null = null;

  // 候補時刻による待機時間があるため、数回の反復で逆算時刻を安定させる
  for (let index = 0; index < 3; index += 1) {
    latestForwardResult = await runForwardPlanning({
      ...params,
      departure: {
        ...params.departure,
        time: estimatedDepartureTime,
      },
    });

    const consumedMinutes = Math.round(latestForwardResult.totalDuration / 60);
    const nextDepartureTime = minutesToTime(targetArrivalMinutes - consumedMinutes);

    if (nextDepartureTime === estimatedDepartureTime) break;
    estimatedDepartureTime = nextDepartureTime;
  }

  if (!latestForwardResult) {
    latestForwardResult = await runForwardPlanning({
      ...params,
      departure: {
        ...params.departure,
        time: estimatedDepartureTime,
      },
    });
  }

  return {
    routes: latestForwardResult.routes,
    arrivalTime: latestForwardResult.arrivalTime,
    departureTime: estimatedDepartureTime,
    messages: latestForwardResult.messages,
    totalDuration: latestForwardResult.totalDuration,
    totalDistance: latestForwardResult.totalDistance,
    updatedSpots: latestForwardResult.updatedSpots,
    updatedDeparture: latestForwardResult.updatedDeparture,
    updatedDestination: latestForwardResult.updatedDestination,
  };
}

/**
 * 算出された到着時間が目標到着時間を超過しているかを判定
 * @param calculatedArrivalTime
 * @param targetArrivalTime
 * @returns 超過している場合はtrue、それ以外はfalse
 */
function calculateIsOverTime(calculatedArrivalTime: string, targetArrivalTime?: string): boolean {
  if (!targetArrivalTime || !isValidTimeFormat(targetArrivalTime)) return false;
  return timeToMinutes(calculatedArrivalTime) > timeToMinutes(targetArrivalTime);
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
 * プランニングの時間計算モード
 */
type PlanningMode = 'FORWARD' | 'BACKWARD' | 'BOTH';

/**
 * プランニングモードを判定
 */
export function determinePlanningMode(departureTime: string, arrivalTime: string): PlanningMode {
  const hasDeparture = departureTime && /^\d{2}:\d{2}$/.test(departureTime);
  const hasArrival = arrivalTime && /^\d{2}:\d{2}$/.test(arrivalTime);

  if (hasDeparture && hasArrival) return 'BOTH';
  if (hasDeparture) return 'FORWARD';
  if (hasArrival) return 'BACKWARD';

  throw new Error('出発時間または到着時間のどちらかを入力してください');
}

/**
 * メインプランニング関数
 */
export async function executePlanning(params: PlanningParams): Promise<PlanningResult> {
  const { departure, destination } = params;
  const departureTime = departure.time || '';
  const arrivalTime = destination.time || '';

  const mode = determinePlanningMode(departureTime, arrivalTime);

  let result: PlanningResult;

  switch (mode) {
    case 'FORWARD': {
      const forwardResult = await runForwardPlanning(params);
      const isOverTime = calculateIsOverTime(forwardResult.arrivalTime, arrivalTime);
      result = {
        routes: forwardResult.routes,
        totalDistance: forwardResult.totalDistance,
        totalDuration: forwardResult.totalDuration,
        departureTime,
        arrivalTime: forwardResult.arrivalTime,
        isOverTime,
        messages: forwardResult.messages,
        updatedSpots: forwardResult.updatedSpots,
        updatedDeparture: forwardResult.updatedDeparture,
        updatedDestination: forwardResult.updatedDestination,
      };
      break;
    }

    case 'BACKWARD': {
      const backwardResult = await runBackwardPlanning(params);
      const isOverTime = calculateIsOverTime(backwardResult.arrivalTime, arrivalTime);
      const overTimeMinutes =
        isOverTime && arrivalTime ? timeToMinutes(backwardResult.arrivalTime) - timeToMinutes(arrivalTime) : 0;
      const arrivalWarning =
        isOverTime && arrivalTime
          ? createArrivalWarning(backwardResult.departureTime, arrivalTime, backwardResult.arrivalTime)
          : null;
      if (isOverTime && arrivalTime) {
        backwardResult.messages.push({
          level: 'WARNING',
          message: buildOverTimeSuggestionMessage(overTimeMinutes),
          segmentKey: PLANNING_MESSAGE_SEGMENT.OVER_TIME,
        });
      }

      result = {
        routes: backwardResult.routes,
        totalDistance: backwardResult.totalDistance,
        totalDuration: backwardResult.totalDuration,
        departureTime: backwardResult.departureTime,
        arrivalTime: backwardResult.arrivalTime,
        isOverTime,
        overTimeMinutes,
        arrivalWarning,
        messages: backwardResult.messages,
        updatedSpots: backwardResult.updatedSpots,
        updatedDeparture: backwardResult.updatedDeparture,
        updatedDestination: backwardResult.updatedDestination,
      };
      break;
    }

    case 'BOTH': {
      // 出発時間から順方向に計算
      const forwardResult = await runForwardPlanning(params);
      let extraTimeMessage: string | undefined;

      // 到着時間を超過しているか確認
      const isOverTime = calculateIsOverTime(forwardResult.arrivalTime, arrivalTime);
      const arrivalWarning =
        isOverTime && arrivalTime ? createArrivalWarning(departureTime, arrivalTime, forwardResult.arrivalTime) : null;
      if (isOverTime && arrivalTime) {
        // OVER_TIME は1件のみ表示する
      }
      const overTimeMinutes = isOverTime ? timeToMinutes(forwardResult.arrivalTime) - timeToMinutes(arrivalTime) : 0;

      // 余裕時間を計算（到着時間より早く着く場合）
      const extraTimeMinutes = !isOverTime ? timeToMinutes(arrivalTime) - timeToMinutes(forwardResult.arrivalTime) : 0;

      // 到着時間超過の警告を追加
      if (isOverTime) {
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

      result = {
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
      break;
    }
  }

  result.messages = sortPlanningMessages(result.messages);

  return result;
}
