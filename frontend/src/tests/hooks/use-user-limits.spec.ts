import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { DEFAULT_USER_LIMITS } from '@shared/user/types';

// SWRのモック
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// use-fetcherのモック
vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({
    getFetcher: vi.fn(),
    isAuthenticated: true,
    isSessionLoading: false,
    session: { user: { id: 'test-user' } },
  }),
}));

import useSWR from 'swr';
import { useUserLimits } from '@/hooks/use-user-limits';

const mockUseSWR = vi.mocked(useSWR);

describe('useUserLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('API応答がある場合、APIの値が返る (F-4)', async () => {
    const apiLimits = {
      maxWishlistSpots: 15,
      maxPlans: 3,
      maxSpotsPerDay: 4,
      maxPlanDays: 2,
      maxUserLocations: 1,
    };
    mockUseSWR.mockReturnValue({
      data: apiLimits,
      error: undefined,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useUserLimits());

    await waitFor(() => {
      expect(result.current.limits).toEqual(apiLimits);
      expect(result.current.error).toBeUndefined();
    });
  });

  it('取得中はDEFAULT_USER_LIMITSが返る (F-5a)', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    } as any);

    const { result } = renderHook(() => useUserLimits());

    expect(result.current.limits).toEqual(DEFAULT_USER_LIMITS);
    expect(result.current.isLoading).toBe(true);
  });

  it('取得エラー時はerrorが返る (F-5b)', async () => {
    const mockError = new Error('取得失敗');
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useUserLimits());

    expect(result.current.error).toBe(mockError);
    expect(result.current.limits).toEqual(DEFAULT_USER_LIMITS);
  });
});
