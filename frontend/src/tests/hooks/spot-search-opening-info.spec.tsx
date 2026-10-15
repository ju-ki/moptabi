import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';

import { useWishlistSpots } from '@/hooks/spot-search/use-wishlist-spots';
import { useVisitedSpots } from '@/hooks/spot-search/use-visited-spots';

/**
 * 行きたいリスト・過去のスポットのフックが、営業時間の判定用データ（No.158）を
 * スポット詳細から引き継ぐことを検証する
 */

// API と Google Maps API はテスト環境で呼べないためモックする
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
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      {children}
    </SWRConfig>
  );
};

const openingHours = [{ day: '月', hours: '10:00-17:00' }];
const openingPeriods = [{ open: { day: 1, hour: 10, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } }];

const mockApi = (items: Record<string, unknown>[]) => {
  vi.mocked(useFetcher).mockReturnValue({
    getFetcher: vi.fn().mockResolvedValue(items),
  } as unknown as ReturnType<typeof useFetcher>);
  vi.mocked(fetchPlaceDetailsWithRetry).mockResolvedValue({
    hasError: false,
    data: {
      spotId: 'spot-1',
      name: '美術館',
      latitude: 35.0,
      longitude: 139.0,
      rating: 4.2,
      openingHours,
      openingPeriods,
      businessStatus: 'CLOSED_TEMPORARILY',
    },
  });
};

describe('スポット検索フックの営業時間データ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useWishlistSpots は営業時間と営業状況を引き継ぐこと', async () => {
    mockApi([{ spotId: 'spot-1', priority: 3, memo: null, visitedAt: null, createdAt: '2026-10-01T00:00:00Z' }]);

    const { result } = renderHook(() => useWishlistSpots(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.spots.length).toBe(1);
    });
    expect(result.current.spots[0].regularOpeningHours).toEqual(openingHours);
    expect(result.current.spots[0].openingPeriods).toEqual(openingPeriods);
    expect(result.current.spots[0].businessStatus).toBe('CLOSED_TEMPORARILY');
  });

  it('useVisitedSpots は営業時間と営業状況を引き継ぐこと', async () => {
    mockApi([{ spotId: 'spot-1', visitedAt: null, visitCount: 1, planDate: '2026-09-01' }]);

    const { result } = renderHook(() => useVisitedSpots(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.spots.length).toBe(1);
    });
    expect(result.current.spots[0].openingPeriods).toEqual(openingPeriods);
    expect(result.current.spots[0].businessStatus).toBe('CLOSED_TEMPORARILY');
  });
});
