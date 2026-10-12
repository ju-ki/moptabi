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
