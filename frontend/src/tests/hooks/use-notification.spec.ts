import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ClerkProvider } from '@clerk/nextjs';
import useSWR from 'swr';

import { useNotification } from '@/hooks/use-notification';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: vi.fn(() => Promise.resolve('mock-token')),
  }),
}));

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

const mockUseSWR = vi.mocked(useSWR);

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 現在日時を固定（2025-01-01 JST）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ローディング状態', () => {
    it('データ取得中はisLoadingがtrueになる', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotification());

      expect(result.current.isLoading).toBe(true);
    });

    it('データ取得完了後はisLoadingがfalseになる', () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotification());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('お知らせ一覧取得', () => {
    it('お知らせがない場合は空配列を返す', () => {
      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/notification/unread-count')) {
          return {
            data: { count: 0 },
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

      const { result } = renderHook(() => useNotification());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('お知らせ一覧を取得できる', () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'テストお知らせ1',
          content: '内容1',
          type: 'SYSTEM',
          publishedAt: '2025-01-01T00:00:00Z',
          createdAt: '2025-01-01T00:00:00Z',
          isRead: false,
          readAt: null,
        },
        {
          id: 2,
          title: 'テストお知らせ2',
          content: '内容2',
          type: 'INFO',
          publishedAt: '2024-12-31T00:00:00Z',
          createdAt: '2024-12-31T00:00:00Z',
          isRead: true,
          readAt: '2025-01-01T00:00:00Z',
        },
      ];

      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/notification/unread-count')) {
          return {
            data: { count: 1 },
            error: undefined,
            isLoading: false,
            isValidating: false,
            mutate: vi.fn(),
          };
        }
        return {
          data: mockNotifications,
          error: undefined,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      });

      const { result } = renderHook(() => useNotification());

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0].title).toBe('テストお知らせ1');
      expect(result.current.unreadCount).toBe(1);
    });
  });

  describe('未読件数', () => {
    it('未読件数が正しく取得できる', () => {
      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/notification/unread-count')) {
          return {
            data: { count: 5 },
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

      const { result } = renderHook(() => useNotification());

      expect(result.current.unreadCount).toBe(5);
    });

    it('未読件数が99を超える場合はhasMoreUnreadがtrueになる', () => {
      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/notification/unread-count')) {
          return {
            data: { count: 100 },
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

      const { result } = renderHook(() => useNotification());

      expect(result.current.unreadCount).toBe(100);
      expect(result.current.hasMoreUnread).toBe(true);
    });

    it('未読件数が99以下の場合はhasMoreUnreadがfalseになる', () => {
      mockUseSWR.mockImplementation((key: string | null) => {
        if (key?.includes('/notification/unread-count')) {
          return {
            data: { count: 99 },
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

      const { result } = renderHook(() => useNotification());

      expect(result.current.hasMoreUnread).toBe(false);
    });
  });

  describe('既読機能', () => {
    it('markAsRead関数が提供される', () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotification());

      expect(typeof result.current.markAsRead).toBe('function');
    });

    it('markAllAsRead関数が提供される', () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotification());

      expect(typeof result.current.markAllAsRead).toBe('function');
    });
  });

  describe('エラー状態', () => {
    it('エラーが発生した場合はerrorが設定される', () => {
      const mockError = new Error('Network error');

      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotification());

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('データ更新', () => {
    it('mutate関数が提供される', () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotification());

      expect(typeof result.current.mutate).toBe('function');
    });
  });
});
