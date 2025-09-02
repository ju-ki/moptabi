import { Coordination, Spot, TransportNodeType } from '@/types/plan';

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
 * 座標からルート情報を取得する関数
 * @param fromCoordination 出発地の座標
 * @param toCoordination 目的地の座標
 * @returns ルート情報
 */
export const calcRoutes = async (
  fromCoordination: Coordination,
  toCoordination: Coordination,
): Promise<RouteResult> => {
  const responseRoute = await getRoute(fromCoordination, toCoordination);
  if (!responseRoute) {
    throw new Error('ルートの取得に失敗しました。');
  }

  return responseRoute;
};
