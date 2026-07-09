import { Coordination, Spot, TransportNodeType, TravelModeType } from '@/types/plan';
import { DepartureAndDestinationType } from '@/models/planLocation';

import { getRoute, RouteResult } from './plan';

interface SortedSpot {
  order: number;
  spotId: string;
}

/**
 * 開始時間の昇順でソートを行い、orderを更新するための関数
 * @param spots 観光スポットの配列
 * @returns 観光地の順序とspotIdの配列(これを元にロジック側で更新をかける)
 */
export const sortSpotByStartTime = (spots: Spot[]): SortedSpot[] => {
  if (!spots || spots.length === 0) {
    return [];
  }

  // 出発地と目的地は除外する
  spots = spots.filter(
    (spot) =>
      spot.transports?.fromType === TransportNodeType.SPOT && spot.transports?.toType === TransportNodeType.SPOT,
  );
  //
  spots.sort((a, b) => {
    const startA = a.stayStart ?? '00:00';
    const startB = b.stayStart ?? '00:00';

    const startATotalTime = parseInt(startA.split(':')[0]) * 60 + parseInt(startA.split(':')[1]);
    const startBTotalTime = parseInt(startB.split(':')[0]) * 60 + parseInt(startB.split(':')[1]);
    return startATotalTime - startBTotalTime;
  });

  // ソート後に連番を振り直す
  const sortedSpots: SortedSpot[] = spots.map((spot, index) => ({
    order: index + 1,
    spotId: spot.id,
  }));

  return sortedSpots;
};

/**
 * 観光スポットが選択された際に、開始時間を自動的に設定する関数
 * @param newSpot 新たに選択された観光スポット
 * @param spots 既に選択済みの観光スポット
 * @return 開始時間と終了時間が更新された観光スポット
 */
export const setStartTimeAutomatically = (newSpot: Spot, spots: Spot[]): Spot => {
  const clonedNewSpot = { ...newSpot };
  // 出発地と目的地は除外する
  spots = spots.filter(
    (spot) =>
      spot.transports?.fromType === TransportNodeType.SPOT && spot.transports?.toType === TransportNodeType.SPOT,
  );

  if (spots.length == 0) {
    // 最初のスポットの場合は09:00で設定
    // TODO: どこかで管理する
    clonedNewSpot.stayStart = '09:00';
    clonedNewSpot.stayEnd = '10:00';
    clonedNewSpot.stayDuration = 60;
    return clonedNewSpot;
  }

  // 末尾に設定されている観光スポットの終了時間を元に開始時間を設定

  // 前スポットの終了時間+1時間の幅で更新をかける
  const lastSpotEndTime = spots[spots.length - 1].stayEnd;
  const [lastHour, lastMinute] = lastSpotEndTime.split(':').map(Number);
  const newStartHour = lastHour + Math.floor(lastMinute / 60);
  const newEndHour = newStartHour + 1;

  // 24時を超えて設定される場合は補正処理をかける
  // TODO: 需要があれば翌日の時間帯に設定等も考える
  if (newStartHour >= 24) {
    clonedNewSpot.stayStart = `23:${String(lastMinute % 60).padStart(2, '0')}`;
    clonedNewSpot.stayEnd = `24:${String(lastMinute % 60).padStart(2, '0')}`;
    return clonedNewSpot;
  }

  clonedNewSpot.stayStart = `${String(newStartHour).padStart(2, '0')}:${String(lastMinute % 60).padStart(2, '0')}`;
  clonedNewSpot.stayEnd = `${String(newEndHour).padStart(2, '0')}:${String(lastMinute % 60).padStart(2, '0')}`;

  return clonedNewSpot;
};

/**
 * 座標から距離を計算する処理
 * @param baseCoordinate - 元となる座標
 * @param targetCoordination - 対象となる座標
 * @returns km換算された文字列
 */
export const calcDistance = (baseCoordinate: Coordination, targetCoordination: Coordination): string => {
  let distance = '';

  const R = 6371; // km
  const dLat = ((targetCoordination.lat - baseCoordinate.lat) * Math.PI) / 180;
  const dLng = ((targetCoordination.lng - baseCoordinate.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((baseCoordinate.lat * Math.PI) / 180) *
      Math.cos((targetCoordination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  distance = (R * c).toFixed(2) + 'km'; // km

  return distance;
};

/**
 * 様々なフォーマットの時間文字列から日・時間・分を抽出する
 * 対応フォーマット例:
 * - 日本語: "1日2時間30分", "2時間30分", "45分", "1時間"
 * - 英語: "1 day 2 hours 30 mins", "2 hours 30 minutes", "45 mins", "1 hour"
 * - 短縮形: "1d 2h 30m", "2h 30m", "30m", "1h"
 * - Google Maps形式: "1 day 2 hrs 30 mins", "2 hrs", "30 min"
 * @param timeString - 時間を表す文字列
 * @returns { days: number, hours: number, minutes: number } 抽出された時間情報
 */
export const parseTimeString = (
  timeString: string,
): {
  days: number;
  hours: number;
  minutes: number;
} => {
  if (!timeString || typeof timeString !== 'string') {
    return { days: 0, hours: 0, minutes: 0 };
  }

  // 日（days）を抽出する正規表現
  // マッチ例: "1日", "2 days", "1 day", "3d"
  const dayRegex = /(\d+)\s*(?:日|days?|d\b)/i;

  // 時間（hours）を抽出する正規表現
  // マッチ例: "2時間", "3 hours", "1 hour", "2 hrs", "1 hr", "4h"
  const hourRegex = /(\d+)\s*(?:時間|hours?|hrs?|h\b)/i;

  // 分（minutes）を抽出する正規表現
  // マッチ例: "30分", "45 minutes", "15 mins", "10 min", "5m"
  const minuteRegex = /(\d+)\s*(?:分|minutes?|mins?|m\b)/i;

  const dayMatch = timeString.match(dayRegex);
  const hourMatch = timeString.match(hourRegex);
  const minuteMatch = timeString.match(minuteRegex);

  return {
    days: dayMatch ? parseInt(dayMatch[1], 10) : 0,
    hours: hourMatch ? parseInt(hourMatch[1], 10) : 0,
    minutes: minuteMatch ? parseInt(minuteMatch[1], 10) : 0,
  };
};

/**
 * 時間情報を合計分に変換する
 * @param time - { days, hours, minutes } オブジェクト
 * @returns 合計分数
 */
export const timeToTotalMinutes = (time: { days: number; hours: number; minutes: number }): number => {
  return time.days * 24 * 60 + time.hours * 60 + time.minutes;
};

/**
 * 所要時間の合計値を計算する処理
 * @param departure - 出発地の情報
 * @param destination - 目的地の情報
 * @param spots - スポット一覧
 * @returns 文字列化した合計値
 */
export const calcTotalTransportTime = (
  departure: DepartureAndDestinationType,
  destination: DepartureAndDestinationType,
  spots: Spot[],
): string => {
  let totalMinutes = 0;

  // 出発地から最初のスポットへの移動時間を加算
  if (departure.transports?.travelTime) {
    const parsedTime = parseTimeString(departure.transports.travelTime);
    totalMinutes += timeToTotalMinutes(parsedTime);
  }

  // 観光地間の移動時間を合算する
  spots.forEach((spot) => {
    if (!spot.transports?.travelTime) {
      return;
    }
    const parsedTime = parseTimeString(spot.transports.travelTime);
    totalMinutes += timeToTotalMinutes(parsedTime);
  });

  // 最後のスポットから目的地への移動時間を加算
  if (destination.transports?.travelTime) {
    const parsedTime = parseTimeString(destination.transports.travelTime);
    totalMinutes += timeToTotalMinutes(parsedTime);
  }

  // 合計分を表示形式に変換
  const totalDays = Math.floor(totalMinutes / (24 * 60));
  const remainingAfterDays = totalMinutes % (24 * 60);
  const finalHours = Math.floor(remainingAfterDays / 60);
  const finalMinutes = remainingAfterDays % 60;

  // 結果の整形
  const resultParts: string[] = [];

  if (totalDays > 0) {
    resultParts.push(`${totalDays} day${totalDays > 1 ? 's' : ''}`);
  }

  if (finalHours > 0) {
    resultParts.push(`${finalHours} hour${finalHours > 1 ? 's' : ''}`);
  }

  if (finalMinutes > 0 || totalMinutes === 0) {
    const minuteLabel = finalMinutes === 1 ? 'min' : 'mins';
    resultParts.push(`${finalMinutes} ${minuteLabel}`);
  }

  // 時間も分もなかった場合のフォールバック
  if (resultParts.length === 0) {
    return '0 mins';
  }

  return resultParts.join(' ');
};

interface DurationProps {
  start: string;
  end: string;
}

/**
 * 滞在時間を算出するロジック
 * @param durationProps - 開始時刻と終了時刻を含むオブジェクト
 * @param durationProps.start - 開始時刻（"HH:MM" 形式）
 * @param durationProps.end - 終了時刻（"HH:MM" 形式）
 * @returns 滞在時間の日本語表示（例: "2時間30分"、"1時間", "45分"
 */
export function calculateDuration(durationProps: DurationProps) {
  const start = durationProps.start;
  const end = durationProps.end;
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    throw new Error('時刻は "HH:MM" 形式で指定してください');
  }

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    throw new Error('無効な時刻が指定されました');
  }

  const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}時間${minutes}分`;
  } else if (hours > 0) {
    return `${hours}時間`;
  } else {
    return `${minutes}分`;
  }
}

/**
 * 座標からルート情報を取得する関数
 * @param fromCoordination 出発地の座標
 * @param toCoordination 目的地の座標
 * @param transportMethod 移動手段
 * @returns ルート情報
 */
export const calcRoutes = async (
  fromCoordination: Coordination,
  toCoordination: Coordination,
  transportMethod: TravelModeType,
): Promise<RouteResult> => {
  const responseRoute = await getRoute(fromCoordination, toCoordination, transportMethod);
  if (!responseRoute) {
    throw new Error('ルートの取得に失敗しました。');
  }

  return responseRoute;
};
/**
 * Google Maps APIのAddressComponentから都道府県を取得する
 * @param addressComponents google Map Apiから提供された住所コンポーネント配列
 * @returns マッチした都道府県、見つからない場合は空文字
 */
export function getPrefectures(addressComponents: google.maps.places.AddressComponent[] | undefined): string {
  if (!addressComponents || addressComponents.length === 0) {
    return '';
  }

  // administrative_area_level_1 タイプが都道府県を示す
  const prefectureComponent = addressComponents.find((component) =>
    component.types.includes('administrative_area_level_1'),
  );

  return prefectureComponent?.longText ?? '';
}
