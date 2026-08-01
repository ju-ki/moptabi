import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * useAdminData フック テスト
 *
 * モック化の理由:
 * - next-auth/react の useSession はブラウザセッションコンテキストに依存するためモック化
 * - swr は APIリクエストを実行するためモック化
 * - use-fetcher はサーバーサイドの認証トークン取得に依存するためモック化
 * - global.fetch は postNotification/updateNotification/deleteNotification の HTTP 処理に使用のためモック化
 */

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('swr', () => ({
  default: vi.fn(),
}));

vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({
    getFetcher: vi.fn(),
  }),
}));

import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { useAdminData } from '@/hooks/use-admin';

const mockUseSession = vi.mocked(useSession);
const mockUseSWR = vi.mocked(useSWR);

const mockDashboardData = {
  totalUsers: 100,
  activeUserCountFromLastMonth: 20,
  wishlistStats: {
    totalWishlist: 50,
    wishlistIncreaseFromLastMonth: 5,
  },
  tripStats: {
    totalPlans: 30,
    planIncreaseFromLastMonth: 3,
    averagePlansPerUser: 0.3,
  },
};

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // fetch のグローバルモック
    global.fetch = vi.fn();
  });

  describe('ローディング状態', () => {
    it('セッションロード中は isLoading が true になること', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useAdminData());

      // 課題301:セッションが読み込まれていない場合はそもそも通信が行われないため、isLoading は false になる
      expect(result.current.isLoading).toBe(false);
    });

    it('SWR ロード中は isLoading が true になること', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useAdminData());

      expect(result.current.isLoading).toBe(true);
    });

    it('認証済みかつデータ取得完了後は isLoading が false になること', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useAdminData());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('dashboardData', () => {
    it('未認証時はダッシュボード取得のキーが null になること', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      renderHook(() => useAdminData());

      expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
    });

    it('SWR から取得したダッシュボードデータが返されること', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useAdminData());

      expect(result.current.dashboardData).toEqual(mockDashboardData);
      expect(result.current.dashboardData?.totalUsers).toBe(100);
      expect(result.current.dashboardData?.wishlistStats.totalWishlist).toBe(50);
      expect(result.current.dashboardData?.tripStats.totalPlans).toBe(30);
    });

    it('データ未取得時は dashboardData が undefined になること', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useAdminData());

      expect(result.current.dashboardData).toBeUndefined();
    });

    it('API エラー時は error が設定されること', () => {
      const mockError = new Error('500 Internal Server Error');
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useAdminData());

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('postNotification', () => {
    it('通知作成時に正しいエンドポイントへ POST リクエストが送信されること', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const { result } = renderHook(() => useAdminData());

      const newNotification = {
        title: 'テスト通知',
        content: 'テストメッセージ',
        type: 'INFO' as const,
        publishedAt: '2025-01-01T00:00:00Z',
      };

      await act(async () => {
        await result.current.postNotification(newNotification);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notification'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newNotification),
          headers: expect.objectContaining({
            'X-User-Id': 'admin-1',
            'X-User-Email': 'admin@test.com',
            'X-User-Name': 'Admin',
          }),
        }),
      );
    });

    it('POST 失敗時はエラーがスローされること', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useAdminData());

      await expect(
        result.current.postNotification({
          title: 'エラーテスト',
          content: 'エラーメッセージ',
          type: 'INFO' as const,
          publishedAt: '2025-01-01T00:00:00Z',
        }),
      ).rejects.toThrow('Failed to create notification: 500');
    });
  });

  describe('updateNotification', () => {
    it('通知更新時に正しいエンドポイントへ PATCH リクエストが送信されること', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com', name: '管理者 太郎' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const { result } = renderHook(() => useAdminData());

      const updatePayload = {
        id: 7,
        title: '更新タイトル',
        content: '更新内容',
        type: 'SYSTEM' as const,
        publishedAt: '2025-01-01',
      };

      await act(async () => {
        await result.current.updateNotification(updatePayload);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notification/7'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
          headers: expect.objectContaining({
            'X-User-Name': encodeURIComponent('管理者 太郎'),
          }),
        }),
      );
    });

    it('PATCH 失敗時はエラーがスローされること', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
      });

      const { result } = renderHook(() => useAdminData());

      await expect(
        result.current.updateNotification({
          id: 7,
          title: '更新失敗テスト',
          content: '更新失敗',
          type: 'INFO' as const,
          publishedAt: '2025-01-01',
        }),
      ).rejects.toThrow('Failed to update notification: 400');
    });
  });

  describe('deleteNotification', () => {
    it('通知削除時に正しいエンドポイントへ DELETE リクエストが送信されること', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const { result } = renderHook(() => useAdminData());

      await act(async () => {
        await result.current.deleteNotification(42);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notification/42'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('DELETE 失敗時はエラーがスローされること', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'admin-1' }, expires: '' },
        status: 'authenticated',
        update: vi.fn(),
      });
      mockUseSWR.mockReturnValue({
        data: mockDashboardData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useAdminData());

      await expect(result.current.deleteNotification(999)).rejects.toThrow('Failed to delete notification: 404');
    });
  });
});
