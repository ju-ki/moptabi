import { createRoute, z } from '@hono/zod-openapi';

import {
  NotificationListResponseSchema,
  UnreadCountResponseSchema,
  MarkReadResponseSchema,
  MarkAllReadResponseSchema,
} from '@/models/notification';

/**
 * お知らせ一覧取得
 * リアルタイム対応を見据え、ユーザーに紐づくお知らせを取得
 */
export const getNotificationsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Notification'],
  summary: 'お知らせ一覧を取得',
  description: 'ユーザーに紐づくお知らせ一覧を公開日時の降順で取得します。未来の公開日時のお知らせは除外されます。',
  responses: {
    200: {
      description: 'お知らせ一覧の取得に成功',
      content: {
        'application/json': {
          schema: NotificationListResponseSchema,
        },
      },
    },
    401: { description: '認証エラー' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 未読件数取得
 * ヘッダーのバッジ表示などで使用
 */
export const getUnreadCountRoute = createRoute({
  method: 'get',
  path: '/unread-count',
  tags: ['Notification'],
  summary: '未読のお知らせ件数を取得',
  description: 'ユーザーの未読お知らせ件数を取得します。ヘッダーのバッジ表示などに使用します。',
  responses: {
    200: {
      description: '未読件数の取得に成功',
      content: {
        'application/json': {
          schema: UnreadCountResponseSchema,
        },
      },
    },
    401: { description: '認証エラー' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 既読にする
 * 個別のお知らせを既読にマーク
 */
export const markAsReadRoute = createRoute({
  method: 'patch',
  path: '/{id}/read',
  tags: ['Notification'],
  summary: '指定したお知らせを既読にする',
  description: '指定したIDのお知らせを既読状態に更新します。',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '1', description: 'お知らせID' }),
    }),
  },
  responses: {
    200: {
      description: '既読への更新に成功',
      content: {
        'application/json': {
          schema: MarkReadResponseSchema,
        },
      },
    },
    401: { description: '認証エラー' },
    404: { description: 'お知らせが見つかりません' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 全て既読にする
 * 一括で全ての未読お知らせを既読に
 */
export const markAllAsReadRoute = createRoute({
  method: 'patch',
  path: '/read-all',
  tags: ['Notification'],
  summary: '全てのお知らせを既読にする',
  description: 'ユーザーの全ての未読お知らせを一括で既読状態に更新します。',
  responses: {
    200: {
      description: '全て既読への更新に成功',
      content: {
        'application/json': {
          schema: MarkAllReadResponseSchema,
        },
      },
    },
    401: { description: '認証エラー' },
    500: { description: 'サーバーエラー' },
  },
});
