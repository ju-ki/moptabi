import { describe, it, expect } from 'vitest';

import { calcMidpoint } from '@/lib/geo';
import type { Coordination } from '@/types/plan';

const makeCoord = (id: string, name: string, lat: number, lng: number): Coordination => ({
  id,
  name,
  lat,
  lng,
});

describe('calcMidpoint', () => {
  describe('同一座標を渡した場合', () => {
    it('同じ座標を返す', () => {
      const point = makeCoord('a', '東京駅', 35.6812, 139.7671);
      const result = calcMidpoint(point, point);
      expect(result.lat).toBe(35.6812);
      expect(result.lng).toBe(139.7671);
    });
  });

  describe('異なる2座標を渡した場合', () => {
    it('緯度の中間値を返す', () => {
      const a = makeCoord('a', '東京駅', 35.0, 139.0);
      const b = makeCoord('b', '大阪駅', 37.0, 139.0);
      const result = calcMidpoint(a, b);
      expect(result.lat).toBe(36.0);
    });

    it('経度の中間値を返す', () => {
      const a = makeCoord('a', '東京駅', 35.0, 138.0);
      const b = makeCoord('b', '名古屋駅', 35.0, 142.0);
      const result = calcMidpoint(a, b);
      expect(result.lng).toBe(140.0);
    });

    it('id に両スポットの id を含む文字列を返す', () => {
      const a = makeCoord('spot-1', '東京駅', 35.0, 139.0);
      const b = makeCoord('spot-2', '大阪駅', 34.0, 135.0);
      const result = calcMidpoint(a, b);
      expect(result.id).toBe('midpoint-spot-1-spot-2');
    });

    it('name に両スポットの名前を含む文字列を返す', () => {
      const a = makeCoord('a', '東京駅', 35.0, 139.0);
      const b = makeCoord('b', '大阪駅', 34.0, 135.0);
      const result = calcMidpoint(a, b);
      expect(result.name).toBe('東京駅と大阪駅の中間');
    });
  });

  describe('実際の座標での計算', () => {
    it('東京駅と大阪駅の中間地点が名古屋付近になる', () => {
      const tokyo = makeCoord('tokyo', '東京駅', 35.6812, 139.7671);
      const osaka = makeCoord('osaka', '大阪駅', 34.7024, 135.4959);
      const result = calcMidpoint(tokyo, osaka);
      // 中間地点の緯度は概ね 35.19（名古屋付近）
      expect(result.lat).toBeCloseTo(35.1918, 2);
      expect(result.lng).toBeCloseTo(137.6315, 2);
    });
  });
});
