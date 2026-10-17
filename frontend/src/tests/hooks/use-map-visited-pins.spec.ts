import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useSWR, { SWRResponse } from 'swr';

import { useMapVisitedPins, VISITED_PIN_FETCH_BATCH } from '@/hooks/spot-search/use-map-visited-pins';
import { fetchPlaceDetailsWithRetry, getCachedCoordinates } from '@/lib/place-fetcher';
import { VisitedSpotWithWishlistType } from '@/models/wishlist';

// 一覧 API はテスト環境で呼べないため、SWR の戻り値を差し替える
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// 認証セッションに依存するためモックする
vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({ getFetcher: vi.fn() }),
}));

// Places API と localStorage の座標キャッシュの代わりに、呼び出し回数と戻り値を制御する
vi.mock('@/lib/place-fetcher', () => ({
  fetchPlaceDetailsWithRetry: vi.fn(),
  getCachedCoordinates: vi.fn(),
}));

/**
 * 地図で探すの過去のスポットのピン（No.341）を検証する
 */

const mockUseSWR = vi.mocked(useSWR);
const mockFetch = vi.mocked(fetchPlaceDetailsWithRetry);
const mockGetCached = vi.mocked(getCachedCoordinates);

const visitedItems = (count: number, prefix = 'spot') =>
  Array.from({ length: count }, (_, i) => ({ spotId: `${prefix}-${i}`, visitCount: 1 }) as VisitedSpotWithWishlistType);

const setVisited = (items: VisitedSpotWithWishlistType[] | undefined) =>
  mockUseSWR.mockReturnValue({ data: items, isLoading: false } as SWRResponse);

describe('useMapVisitedPins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCached.mockReturnValue(null);
    mockFetch.mockImplementation(async (placeId: string) => ({
      data: { spotId: placeId, name: placeId, latitude: 35, longitude: 135 },
      hasError: false,
    }));
  });

  it('OFF のときは一覧も詳細も取得しないこと', () => {
    setVisited(undefined);

    renderHook(() => useMapVisitedPins(false));

    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('座標キャッシュがあるスポットは詳細を取得せずにピンにすること', () => {
    setVisited(visitedItems(3));
    mockGetCached.mockReturnValue({ lat: 34.9, lng: 135.7 });

    const { result } = renderHook(() => useMapVisitedPins(true));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.pins).toHaveLength(3);
    expect(result.current.pins[0]).toEqual({ spotId: 'spot-0', lat: 34.9, lng: 135.7, spot: null });
    expect(result.current.remainingCount).toBe(0);
  });

  it('座標キャッシュがないスポットは20件まで詳細を取得し、残り件数を返すこと', async () => {
    setVisited(visitedItems(25));

    const { result } = renderHook(() => useMapVisitedPins(true));

    await waitFor(() => expect(result.current.pins).toHaveLength(VISITED_PIN_FETCH_BATCH));
    expect(mockFetch).toHaveBeenCalledTimes(VISITED_PIN_FETCH_BATCH);
    expect(result.current.remainingCount).toBe(5);
    expect(result.current.pins[0].spot).toMatchObject({ id: 'spot-0', visitCount: 1 });
  });

  it('loadMore で次の件数を取得すること', async () => {
    setVisited(visitedItems(25));
    const { result } = renderHook(() => useMapVisitedPins(true));
    await waitFor(() => expect(result.current.pins).toHaveLength(VISITED_PIN_FETCH_BATCH));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.pins).toHaveLength(25));
    expect(mockFetch).toHaveBeenCalledTimes(25);
    expect(result.current.remainingCount).toBe(0);
  });

  it('同じスポットが一覧に重複していても1回だけ扱うこと', async () => {
    setVisited([...visitedItems(2), ...visitedItems(2)]);

    const { result } = renderHook(() => useMapVisitedPins(true));

    await waitFor(() => expect(result.current.pins).toHaveLength(2));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
