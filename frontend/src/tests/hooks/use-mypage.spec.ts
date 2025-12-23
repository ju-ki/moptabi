import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useMypageData } from '@/hooks/use-mypage';

// SWRのモック
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// use-fetcherのモック
vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({
    getFetcher: vi.fn(),
  }),
}));

import useSWR from 'swr';

const mockUseSWR = vi.mocked(useSWR);

describe('useMypageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 現在日時を固定（2025-01-01）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ローディング状態', () => {
    it('データ取得中はisLoadingがtrueになる', async () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.isLoading).toBe(true);
    });

    it('全データ取得完了後はisLoadingがfalseになる', async () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('次の旅の判定', () => {
    it('未来のプランがある場合、最も近い日付のプランが返される', () => {
      const mockTrips = [
        { id: 1, title: '過去の旅行', startDate: '2024-12-01', endDate: '2024-12-03' },
        { id: 2, title: '京都旅行', startDate: '2025-01-15', endDate: '2025-01-16' },
        { id: 3, title: '大阪旅行', startDate: '2025-02-01', endDate: '2025-02-02' },
      ];

      // trips API
      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/trips') && !key?.includes('count')) {
          return {
            data: mockTrips,
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/trips/count')) {
          return {
            data: { count: 3, limit: 20 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist') && !key?.includes('count')) {
          return {
            data: [],
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 0, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.nextTrip).not.toBeNull();
      expect(result.current.nextTrip?.id).toBe(2);
      expect(result.current.nextTrip?.title).toBe('京都旅行');
      // モック日付 2025-01-01 から 2025-01-15 まで15日間
      expect(result.current.nextTrip?.daysUntil).toBe(15);
    });

    it('未来のプランがない場合はnullが返される', () => {
      const mockTrips = [{ id: 1, title: '過去の旅行', startDate: '2024-12-01', endDate: '2024-12-03' }];

      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/trips') && !key?.includes('count')) {
          return {
            data: mockTrips,
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/trips/count')) {
          return {
            data: { count: 1, limit: 20 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist') && !key?.includes('count')) {
          return {
            data: [],
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 0, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.nextTrip).toBeNull();
    });
  });

  describe('旅した日数の計算', () => {
    it('過去のプランの総日数が正しく計算される', () => {
      const mockTrips = [
        { id: 1, title: '2日間の旅行', startDate: '2024-12-01', endDate: '2024-12-02' },
        { id: 2, title: '3日間の旅行', startDate: '2024-11-10', endDate: '2024-11-12' },
        { id: 3, title: '未来の旅行', startDate: '2025-02-01', endDate: '2025-02-03' }, // 含まれない
      ];

      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/trips') && !key?.includes('count')) {
          return {
            data: mockTrips,
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/trips/count')) {
          return {
            data: { count: 3, limit: 20 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist') && !key?.includes('count')) {
          return {
            data: [],
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 0, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      // 2日間 + 3日間 = 5日間
      expect(result.current.totalTripDays).toBe(5);
    });

    it('過去のプランがない場合は0が返される', () => {
      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/trips') && !key?.includes('count')) {
          return {
            data: [],
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/trips/count')) {
          return {
            data: { count: 0, limit: 20 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist') && !key?.includes('count')) {
          return {
            data: [],
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 0, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.totalTripDays).toBe(0);
    });
  });

  describe('訪問済み/未訪問スポット数', () => {
    it('訪問済みと未訪問のスポット数が正しくカウントされる', () => {
      const mockWishlist = [
        { id: 1, visited: 1 },
        { id: 2, visited: 1 },
        { id: 3, visited: 0 },
        { id: 4, visited: 0 },
        { id: 5, visited: 0 },
      ];

      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/wishlist') && !key?.includes('count')) {
          return {
            data: mockWishlist,
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 5, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.visitedCount).toBe(2);
      expect(result.current.wishlistCount).toBe(3);
    });
  });

  describe('利用状況', () => {
    it('プラン数と上限が正しく取得される', () => {
      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/trips/count')) {
          return {
            data: { count: 5, limit: 20 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 32, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.planCount).toBe(5);
      expect(result.current.planLimit).toBe(20);
      expect(result.current.wishlistTotalCount).toBe(32);
      expect(result.current.wishlistLimit).toBe(100);
    });
  });

  describe('最近の旅', () => {
    it('過去のプランが開始日降順で最大3件取得される', () => {
      const mockTrips = [
        { id: 1, title: '最新の旅行', startDate: '2024-12-20', endDate: '2024-12-21' },
        { id: 2, title: '2番目の旅行', startDate: '2024-12-10', endDate: '2024-12-11' },
        { id: 3, title: '3番目の旅行', startDate: '2024-11-20', endDate: '2024-11-21' },
        { id: 4, title: '4番目の旅行', startDate: '2024-11-10', endDate: '2024-11-11' }, // 含まれない
        { id: 5, title: '未来の旅行', startDate: '2025-02-01', endDate: '2025-02-02' }, // 含まれない
      ];

      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/trips') && !key?.includes('count')) {
          return {
            data: mockTrips,
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/trips/count')) {
          return {
            data: { count: 5, limit: 20 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist') && !key?.includes('count')) {
          return {
            data: [],
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 0, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.recentTrips).toHaveLength(3);
      expect(result.current.recentTrips[0].title).toBe('最新の旅行');
      expect(result.current.recentTrips[1].title).toBe('2番目の旅行');
      expect(result.current.recentTrips[2].title).toBe('3番目の旅行');
    });

    it('過去のプランがない場合は空配列が返される', () => {
      const mockTrips = [{ id: 1, title: '未来の旅行', startDate: '2025-02-01', endDate: '2025-02-02' }];

      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/trips') && !key?.includes('count')) {
          return {
            data: mockTrips,
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/trips/count')) {
          return {
            data: { count: 1, limit: 20 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist') && !key?.includes('count')) {
          return {
            data: [],
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        if (key?.includes('/wishlist/count')) {
          return {
            data: { count: 0, limit: 100 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: [],
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.recentTrips).toHaveLength(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('API取得エラー時はerrorが設定される', () => {
      const mockError = new Error('API Error');

      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useMypageData());

      expect(result.current.error).toBe(mockError);
    });
  });
});
