import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { getOptimalRouteWithAlternatives } from '@/lib/planning';

import { mockGetRoute, createRouteResult } from './fixtures';

describe('planning.ts: 移動手段の選択', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('移動手段の複数選択時のルール', () => {
    it('複数の移動手段が取得できる場合は優先度の高い手段を採用する', async () => {
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
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
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
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
        if (mode === 'WALKING') return createRouteResult('WALKING', 20, 1400);
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
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [1, 2, 3],
        2,
      );

      expect(result.selectedRoute.transportMethodId).toBe(2);
    });

    it('【異常系】優先移動手段IDが指定されているが、transportMethodIdsに含まれていない場合は移動手段は採用されない', async () => {
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });

      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [1], // 利用可能な交通手段に2が含まれていない
        2,
      );

      // デフォルト移動手段である1が採用される
      expect(result.selectedRoute.transportMethodId).toBe(1);
    });
  });

  describe('2点間のルート取得処理における、手段の重複除去確認', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    it('重複する手段が除去されること', async () => {
      const checkedTransportMethodIds = [1, 2, 3];
      const preferredTransportMethodId = undefined;

      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        if (mode === 'WALKING') return createRouteResult('WALKING', 15, 600);
        if (mode === 'BICYCLING') return createRouteResult('BICYCLING', 8, 1200);
        if (mode === 'DRIVING') return createRouteResult('DRIVING', 5, 1500);
        throw new Error('unexpected');
      });
      const result = await getOptimalRouteWithAlternatives(
        { lat: 35.681236, lng: 139.767125 },
        { lat: 35.6895, lng: 139.6917 },
        [...checkedTransportMethodIds, preferredTransportMethodId ?? 1],
        preferredTransportMethodId,
      );

      expect(result.selectedRoute.transportMethodId).toBe(3);
      expect(result.alternativeRoutes).toHaveLength(3);
      expect(result.isFallbackToWalking).toBe(false);
      expect(result.failedRoutes).toBeUndefined();
    });
  });
});
