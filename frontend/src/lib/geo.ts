import { Coordination } from '@/types/plan';

/**
 * 2座標の中間地点を返す。
 * 国内旅行スケール（数十〜数百km）では単純平均で十分な精度が得られる。
 */
export function calcMidpoint(a: Coordination, b: Coordination): Coordination {
  return {
    id: `midpoint-${a.id}-${b.id}`,
    name: `${a.name}と${b.name}の中間`,
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  };
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * 2座標の直線距離（km）をハバーサインの公式で返す（No.341）
 */
export function calcDistanceKm(a: Pick<Coordination, 'lat' | 'lng'>, b: Pick<Coordination, 'lat' | 'lng'>): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * 距離の表示用文字列を返す。1km 未満は m、以上は小数1桁の km（No.341）
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
