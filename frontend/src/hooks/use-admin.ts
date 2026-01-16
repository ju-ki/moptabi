import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';

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
  const { getToken } = useAuth();
  const { getFetcher } = useFetcher();

  // ダッシュボードデータ
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: dashboardLoading,
  } = useSWR<StatsType>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/dashboard`, getFetcher);

  const isLoading = dashboardLoading;
  const error = dashboardError;

  const postNotification = async (newNotification: NotificationCreate) => {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newNotification),
    });

    if (!response.ok) {
      throw new Error(`Failed to create notification: ${response.status}`);
    }

    return response;
  };
  const updateNotification = async (updatedNotification: NotificationUpdate) => {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/${updatedNotification.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedNotification),
    });

    if (!response.ok) {
      throw new Error(`Failed to update notification: ${response.status}`);
    }

    return response;
  };
  const deleteNotification = async (id: number) => {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
