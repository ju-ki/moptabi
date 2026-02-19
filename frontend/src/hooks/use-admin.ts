import useSWR from 'swr';
import { useSession } from 'next-auth/react';

import { NotificationCreate, NotificationUpdate } from '@/models/notification';
import { StatsType } from '@/models/admin';

import { useFetcher } from './use-fetcher';

// 型定義はuse-user-list.tsとuse-notification-list.tsに移動
// これらの型はエクスポートして他のファイルで使用可能
export type RoleType = 'ADMIN' | 'USER' | 'GUEST';
export type UserSortBy = 'lastLoginAt' | 'registeredAt' | 'planCount' | 'wishlistCount';
export type NotificationSortBy = 'publishedAt' | 'createdAt' | 'readRate';
export type SortOrder = 'asc' | 'desc';
export type NotificationType = 'SYSTEM' | 'INFO';

/**
 * 管理画面用のカスタムフック
 * ダッシュボードデータの取得とCRUD操作を提供
 * ユーザーリスト・通知リストは別フック（use-user-list, use-notification-list）で管理
 */
export function useAdminData() {
  const { data: session } = useSession();
  const { getFetcher } = useFetcher();

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
  } = useSWR<StatsType>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/dashboard`, getFetcher);

  const isLoading = dashboardLoading;
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
