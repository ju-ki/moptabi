import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { NotificationSortBy, NotificationType, RoleType, SortOrder, UserSortBy } from '@shared/admin/types';

import { NotificationCreate, NotificationUpdate } from '@/models/notification';
import { StatsType } from '@/models/admin';

import { useFetcher } from './use-fetcher';

export type { NotificationSortBy, NotificationType, RoleType, SortOrder, UserSortBy };

/**
 * 管理画面用のカスタムフック
 * ダッシュボードデータの取得とCRUD操作を提供
 * ユーザーリスト・通知リストは別フック（use-user-list, use-notification-list）で管理
 */
export function useAdminData() {
  const { data: session, status } = useSession();
  const { getFetcher } = useFetcher();

  // セッションが確立されている場合のみAPIリクエストを発行
  const isSessionLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const shouldFetch = isAuthenticated && !isSessionLoading;

  // 認証ヘッダーを生成
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.user?.id) {
      headers['X-User-Id'] = session.user.id;
    }
    if (session?.user?.email) {
      headers['X-User-Email'] = session.user.email;
    }
    if (session?.user?.name) {
      headers['X-User-Name'] = encodeURIComponent(session.user.name);
    }
    if (session?.user?.image) {
      headers['X-User-Image'] = session.user.image;
    }
    return headers;
  };

  // ダッシュボードデータ
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: dashboardLoading,
  } = useSWR<StatsType>(shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/dashboard` : null, getFetcher);

  const isLoading = isSessionLoading || dashboardLoading;
  const error = dashboardError;

  const postNotification = async (newNotification: NotificationCreate) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newNotification),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to create notification: ${response.status}`);
    }

    return response;
  };
  const updateNotification = async (updatedNotification: NotificationUpdate) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/${updatedNotification.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedNotification),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to update notification: ${response.status}`);
    }

    return response;
  };
  const deleteNotification = async (id: number) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete notification: ${response.status}`);
    }

    return response;
  };

  return {
    // CRUD操作
    postNotification,
    updateNotification,
    deleteNotification,

    // ダッシュボード
    dashboardData: dashboardData,

    // 状態
    isLoading,
    error,
  };
}
