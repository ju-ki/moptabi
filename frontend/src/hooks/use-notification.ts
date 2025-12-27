import useSWR, { KeyedMutator } from 'swr';
import { useCallback } from 'react';

import { useFetcher } from '@/hooks/use-fetcher';

/**
 * お知らせの型定義
 */
export type NotificationType = 'SYSTEM' | 'INFO';

export type NotificationItem = {
  id: number;
  title: string;
  content: string;
  type: NotificationType;
  publishedAt: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
};

/**
 * 未読件数レスポンスの型定義
 */
type UnreadCountResponse = {
  count: number;
};

/**
 * useNotificationの戻り値の型定義
 */
export type UseNotificationReturn = {
  /** お知らせ一覧 */
  notifications: NotificationItem[];
  /** 未読件数 */
  unreadCount: number;
  /** 99件を超える未読があるか */
  hasMoreUnread: boolean;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラー */
  error: Error | null;
  /** 指定したお知らせを既読にする */
  markAsRead: (id: number) => Promise<void>;
  /** 全てのお知らせを既読にする */
  markAllAsRead: () => Promise<void>;
  /** データを再取得する */
  mutate: KeyedMutator<NotificationItem[]>;
};

/**
 * お知らせ機能のカスタムフック
 *
 * 将来的にリアルタイム通知（WebSocket/SSE）への移行を考慮した設計
 * - SWRによるキャッシュと自動再検証
 * - 楽観的UI更新のサポート
 * - エラーハンドリング
 */
export function useNotification(): UseNotificationReturn {
  const { getFetcher } = useFetcher();

  // お知らせ一覧を取得
  const {
    data: notifications = [],
    error: notificationsError,
    isLoading: isNotificationsLoading,
    mutate: mutateNotifications,
  } = useSWR<NotificationItem[]>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification`, getFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // 未読件数を取得
  const {
    data: unreadCountData,
    error: unreadCountError,
    isLoading: isUnreadCountLoading,
    mutate: mutateUnreadCount,
  } = useSWR<UnreadCountResponse>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/unread-count`, getFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const unreadCount = unreadCountData?.count ?? 0;
  const hasMoreUnread = unreadCount > 99;
  const isLoading = isNotificationsLoading || isUnreadCountLoading;
  const error = notificationsError || unreadCountError || null;

  /**
   * 指定したお知らせを既読にする
   */
  const markAsRead = useCallback(
    async (id: number) => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/${id}/read`, {
          method: 'PATCH',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to mark as read');
        }

        // 楽観的UI更新: お知らせ一覧を更新
        await mutateNotifications(
          notifications.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
          false,
        );

        // 未読件数を再取得
        await mutateUnreadCount();
      } catch (err) {
        console.error('Error marking notification as read:', err);
        // エラー時は再取得して最新状態に戻す
        await mutateNotifications();
        await mutateUnreadCount();
        throw err;
      }
    },
    [notifications, mutateNotifications, mutateUnreadCount],
  );

  /**
   * 全てのお知らせを既読にする
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/read-all`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      // 楽観的UI更新: 全てのお知らせを既読に
      await mutateNotifications(
        notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        })),
        false,
      );

      // 未読件数を0に
      await mutateUnreadCount({ count: 0 }, false);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // エラー時は再取得して最新状態に戻す
      await mutateNotifications();
      await mutateUnreadCount();
      throw err;
    }
  }, [notifications, mutateNotifications, mutateUnreadCount]);

  return {
    notifications,
    unreadCount,
    hasMoreUnread,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    mutate: mutateNotifications,
  };
}
