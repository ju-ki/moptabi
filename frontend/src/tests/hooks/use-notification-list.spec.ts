import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * useNotificationList フック テスト
 *
 * モック化の理由:
 * - swr は APIリクエストを実行するためモック化
 * - use-fetcher はサーバーサイドの認証トークン取得に依存するためモック化
 */

vi.mock('swr', () => ({
  default: vi.fn(),
}));

vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({
    getFetcher: vi.fn(),
  }),
}));

import useSWR from 'swr';
import { useNotificationList } from '@/hooks/use-notification-list';

const mockUseSWR = vi.mocked(useSWR);

const mockNotifications = [
  {
    id: 1,
    title: 'メンテナンスのお知らせ',
    message: '2025年1月1日にメンテナンスを行います。',
    type: 'SYSTEM' as const,
    publishedAt: '2025-01-01T00:00:00Z',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
    readCount: 10,
    targetCount: 100,
  },
  {
    id: 2,
    title: '新機能追加のお知らせ',
    message: '地図機能を追加しました。',
    type: 'INFO' as const,
    publishedAt: '2025-01-02T00:00:00Z',
    createdAt: '2024-12-02T00:00:00Z',
    updatedAt: '2024-12-02T00:00:00Z',
    readCount: 5,
    targetCount: 100,
  },
];

const mockPagination = {
  total: 2,
  totalPages: 1,
  currentPage: 1,
  limit: 20,
};

describe('useNotificationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8787';
  });

  describe('クエリ文字列生成', () => {
    it('初期状態では空フィルターがURLに含まれないこと', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      renderHook(() => useNotificationList());

      const url = mockUseSWR.mock.calls[0][0] as string;
      expect(url).toContain('/notification/admin?');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=20');
      expect(url).toContain('sortBy=publishedAt');
      expect(url).toContain('sortOrder=desc');
      expect(url).not.toContain('title=');
      expect(url).not.toContain('type=');
      expect(url).not.toContain('publishedFrom=');
      expect(url).not.toContain('publishedTo=');
    });

    it('フィルター設定後は指定した値のみURLに含まれること', () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      act(() => {
        result.current.executeFilter({
          title: '新機能',
          type: 'INFO',
          publishedFrom: '',
          publishedTo: '',
        });
      });

      const latestUrl = mockUseSWR.mock.calls[mockUseSWR.mock.calls.length - 1][0] as string;
      expect(latestUrl).toContain('title=%E6%96%B0%E6%A9%9F%E8%83%BD');
      expect(latestUrl).toContain('type=INFO');
      expect(latestUrl).not.toContain('publishedFrom=');
      expect(latestUrl).not.toContain('publishedTo=');
    });
  });

  describe('初期状態', () => {
    it('データ未取得時は notifications が空配列になること', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      expect(result.current.notifications).toEqual([]);
    });

    it('初期 query の page が 1 であること', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      expect(result.current.query.page).toBe(1);
    });

    it('初期 query の sortBy が publishedAt であること', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      expect(result.current.query.sortBy).toBe('publishedAt');
      expect(result.current.query.sortOrder).toBe('desc');
    });
  });

  describe('データ取得', () => {
    it('SWR からデータ取得時に notifications が返されること', () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0].title).toBe('メンテナンスのお知らせ');
      expect(result.current.notifications[1].title).toBe('新機能追加のお知らせ');
    });

    it('pagination データが返されること', () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      expect(result.current.pagination).toEqual(mockPagination);
    });

    it('ローディング中は isLoading が true になること', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      expect(result.current.isLoading).toBe(true);
    });

    it('API エラー時に error が設定されること', () => {
      const mockError = new Error('API Error');
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('handlePageChange', () => {
    it('ページ変更時に query の page が更新されること', async () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      act(() => {
        result.current.handlePageChange(3);
      });

      expect(result.current.query.page).toBe(3);
    });
  });

  describe('executeSingleFilter', () => {
    it('単一フィルター実行時にフィルター値が更新されページが 1 にリセットされること', async () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      // まずページを変更
      act(() => {
        result.current.handlePageChange(5);
      });
      expect(result.current.query.page).toBe(5);

      // フィルター実行でページがリセットされること
      act(() => {
        result.current.executeSingleFilter('title', 'メンテナンス');
      });

      expect(result.current.query.title).toBe('メンテナンス');
      expect(result.current.query.page).toBe(1);
    });

    it('空文字の単一フィルター実行時はURLから対象パラメータが除外されること', () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      act(() => {
        result.current.executeSingleFilter('type', 'INFO');
      });

      let latestUrl = mockUseSWR.mock.calls[mockUseSWR.mock.calls.length - 1][0] as string;
      expect(latestUrl).toContain('type=INFO');

      act(() => {
        result.current.executeSingleFilter('type', '');
      });

      latestUrl = mockUseSWR.mock.calls[mockUseSWR.mock.calls.length - 1][0] as string;
      expect(latestUrl).not.toContain('type=');
    });
  });

  describe('executeFilter', () => {
    it('複数フィルターを一括実行できること', async () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      act(() => {
        result.current.executeFilter({
          title: '新機能',
          type: 'INFO',
          publishedFrom: '2025-01-01',
          publishedTo: '2025-12-31',
        });
      });

      expect(result.current.query.title).toBe('新機能');
      expect(result.current.query.type).toBe('INFO');
      expect(result.current.query.publishedFrom).toBe('2025-01-01');
      expect(result.current.query.publishedTo).toBe('2025-12-31');
      expect(result.current.query.page).toBe(1);
    });
  });

  describe('handleSortChange', () => {
    it('ソート変更時に sortBy と sortOrder が更新されページが 1 にリセットされること', async () => {
      mockUseSWR.mockReturnValue({
        data: { notifications: mockNotifications, pagination: mockPagination },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useNotificationList());

      act(() => {
        result.current.handlePageChange(2);
      });

      act(() => {
        result.current.handleSortChange('createdAt', 'asc');
      });

      expect(result.current.query.sortBy).toBe('createdAt');
      expect(result.current.query.sortOrder).toBe('asc');
      expect(result.current.query.page).toBe(1);
    });
  });
});
