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
});
