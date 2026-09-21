import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';

import { useFetchTripDetail } from '@/hooks/use-trip';

/**
 * use-trip テスト
 * 旅程の取得・作成ロジックを検証する
 */

// 外部依存をモック化
vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: vi.fn(),
}));

vi.mock('@/lib/place-fetcher', () => ({
  fetchPlaceDetailsWithRetry: vi.fn(),
}));

import { useFetcher } from '@/hooks/use-fetcher';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        errorRetryCount: 0,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
};

const createMockFetcher = (overrides: any = {}) => ({
  getFetcher: vi.fn(),
  getAuthHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer test-token' }),
  isAuthenticated: true,
  isSessionLoading: false,
  ...overrides,
});

describe('useFetchTripDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('認証状態の確認', () => {
    it('未認証の場合はデータを取得しないこと', async () => {
      (useFetcher as any).mockReturnValue(createMockFetcher({ isAuthenticated: false }));

      const { result } = renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      // 未認証時はURLがnullになりSWRはフェッチしない
      expect(result.current.isLoading).toBe(false);
      expect(result.current.trip).toBeUndefined();
    });

    it('セッション読み込み中はデータを取得しないこと', async () => {
      const mockFetcher = vi.fn();
      (useFetcher as any).mockReturnValue(createMockFetcher({ isSessionLoading: true, getFetcher: mockFetcher }));

      renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      // セッション読み込み中はURLがnullになりAPIは呼ばれない
      await new Promise((r) => setTimeout(r, 100));
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('tripIdがない場合はデータを取得しないこと', async () => {
      (useFetcher as any).mockReturnValue(createMockFetcher());

      const { result } = renderHook(() => useFetchTripDetail(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.trip).toBeUndefined();
    });
  });

  describe('データ取得', () => {
    it('認証済みでtripIdがある場合はAPIを呼び出すこと', async () => {
      const mockRawTrip = {
        title: 'テスト旅行',
        imageUrl: 'test.jpg',
        startDate: '2025-12-20',
        endDate: '2025-12-23',
        tripInfo: '旅行メモ',
        plans: [],
      };

      const mockFetcher = vi.fn().mockResolvedValue(mockRawTrip);
      (useFetcher as any).mockReturnValue(createMockFetcher({ getFetcher: mockFetcher }));

      renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalled();
      });
    });

    it('APIエラー時にerrorが設定されること', async () => {
      const mockFetcher = vi.fn().mockRejectedValue(new Error('API Error'));
      (useFetcher as any).mockReturnValue(createMockFetcher({ getFetcher: mockFetcher }));

      const { result } = renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('スポット・最寄り駅の取得と異常系処理', () => {
    const mockTripWithSpot = {
      title: 'テスト旅行',
      imageUrl: 'test.jpg',
      startDate: '2025-12-20',
      endDate: '2025-12-23',
      tripInfo: '旅行メモ',
      plans: [
        {
          date: '2025-12-20',
          memo: 'プランメモ',
          departure: {
            placeId: 'departure-1',
            latitude: 35.6661,
            longitude: 139.7706,
            nearestStation: {
              placeId: 'dep-station-1',
              transportMethodId: 1,
            },
          },
          destination: {
            placeId: 'destination-1',
            latitude: 35.6895,
            longitude: 139.6917,
            nearestStation: {
              placeId: 'dest-station-1',
              transportMethodId: 1,
            },
          },
          spots: [
            {
              id: 'spot-1',
              placeId: 'spot-1',
              order: 0,
              stayStart: '2025-12-20T10:00:00Z',
              stayEnd: '2025-12-20T11:00:00Z',
              stayDuration: 60,
              nearestStation: {
                placeId: 'spot-station-1',
                transportMethodId: 1,
              },
            },
          ],
        },
      ],
    };

    it('スポット本体取得失敗時は該当スポットが配列から除外されること', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockTripWithSpot);
      (useFetcher as any).mockReturnValue(createMockFetcher({ getFetcher: mockFetcher }));

      // スポット本体の取得失敗、その他は成功
      (fetchPlaceDetailsWithRetry as any).mockImplementation(async (placeId: string) => {
        if (placeId === 'spot-1') {
          return { hasError: true, data: null, errorMessage: 'Spot fetch failed' };
        }
        return {
          hasError: false,
          data: {
            spotId: placeId,
            name: `名前_${placeId}`,
            latitude: 35.6762,
            longitude: 139.6503,
            rating: 4.5,
          },
        };
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.trip?.plans[0].spots.length).toBe(0);
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch place details for spot spot-1'));

      consoleSpy.mockRestore();
    });

    it('スポットの最寄り駅取得失敗時はスポットは残り、nearestStationが未定義になること', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockTripWithSpot);
      (useFetcher as any).mockReturnValue(createMockFetcher({ getFetcher: mockFetcher }));

      // スポット本体は成功、スポット用最寄り駅は失敗
      (fetchPlaceDetailsWithRetry as any).mockImplementation(async (placeId: string) => {
        if (placeId === 'spot-station-1') {
          return { hasError: true, data: null, errorMessage: 'Station fetch failed' };
        }
        return {
          hasError: false,
          data: {
            spotId: placeId,
            name: `名前_${placeId}`,
            latitude: 35.6762,
            longitude: 139.6503,
            rating: 4.5,
          },
        };
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.trip?.plans[0].spots.length).toBe(1);
      });

      expect(result.current.trip?.plans[0].spots[0].nearestStation).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch nearest station for spot spot-1'),
      );

      consoleSpy.mockRestore();
    });

    it('出発地の最寄り駅取得失敗時は出発地は残り、nearestStationが未定義になること', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockTripWithSpot);
      (useFetcher as any).mockReturnValue(createMockFetcher({ getFetcher: mockFetcher }));

      // 出発地用最寄り駅は失敗、その他は成功
      (fetchPlaceDetailsWithRetry as any).mockImplementation(async (placeId: string) => {
        if (placeId === 'dep-station-1') {
          return { hasError: true, data: null, errorMessage: 'Departure station fetch failed' };
        }
        return {
          hasError: false,
          data: {
            spotId: placeId,
            name: `名前_${placeId}`,
            latitude: 35.6762,
            longitude: 139.6503,
            rating: 4.5,
          },
        };
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.trip?.plans[0].departure).toBeDefined();
      });

      expect(result.current.trip?.plans[0].departure.nearestStation).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch departure nearest station'));

      consoleSpy.mockRestore();
    });

    it('目的地の最寄り駅取得失敗時は目的地は残り、nearestStationが未定義になること', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockTripWithSpot);
      (useFetcher as any).mockReturnValue(createMockFetcher({ getFetcher: mockFetcher }));

      // 目的地用最寄り駅は失敗、その他は成功
      (fetchPlaceDetailsWithRetry as any).mockImplementation(async (placeId: string) => {
        if (placeId === 'dest-station-1') {
          return { hasError: true, data: null, errorMessage: 'Destination station fetch failed' };
        }
        return {
          hasError: false,
          data: {
            spotId: placeId,
            name: `名前_${placeId}`,
            latitude: 35.6762,
            longitude: 139.6503,
            rating: 4.5,
          },
        };
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.trip?.plans[0].destination).toBeDefined();
      });

      expect(result.current.trip?.plans[0].destination.nearestStation).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch destination nearest station'));

      consoleSpy.mockRestore();
    });

    it('すべて成功する場合はスポット・最寄り駅情報が正しく合成されること', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockTripWithSpot);
      (useFetcher as any).mockReturnValue(createMockFetcher({ getFetcher: mockFetcher }));

      // すべての取得が成功 - placeIdごとに異なるメタデータを返す
      (fetchPlaceDetailsWithRetry as any).mockImplementation(async (placeId: string) => {
        return {
          hasError: false,
          data: {
            spotId: placeId,
            name: `名前_${placeId}`,
            latitude: 35.6762 + Math.random() * 0.01,
            longitude: 139.6503 + Math.random() * 0.01,
            rating: 4.5,
          },
        };
      });

      const { result } = renderHook(() => useFetchTripDetail('trip-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.trip?.plans[0].spots.length).toBe(1);
      });

      const spot = result.current.trip?.plans[0].spots[0];
      expect(spot?.spotId).toBe('spot-1');
      expect(spot?.name).toBe('名前_spot-1');
      expect(spot?.latitude).toBeDefined();
      expect(spot?.longitude).toBeDefined();
      expect(spot?.nearestStation).toBeDefined();
      expect(spot?.nearestStation?.name).toMatch(/名前_spot-station-1/);
    });
  });
});
