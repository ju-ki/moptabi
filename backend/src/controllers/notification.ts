import { Context } from 'hono';

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/services/notification';

/**
 * お知らせコントローラー
 * ルートハンドラーとサービス層を接続
 */
export const notificationHandler = {
  /**
   * お知らせ一覧を取得
   */
  getNotifications: async (c: Context) => {
    const response = await getNotifications(c);
    return c.json(response, 200);
  },

  /**
   * 未読件数を取得
   */
  getUnreadCount: async (c: Context) => {
    const response = await getUnreadCount(c);
    return c.json(response, 200);
  },

  /**
   * 指定したお知らせを既読にする
   */
  markAsRead: async (c: Context) => {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }
    const response = await markAsRead(c, id);
    return c.json(response, 200);
  },

  /**
   * 全てのお知らせを既読にする
   */
  markAllAsRead: async (c: Context) => {
    const response = await markAllAsRead(c);
    return c.json(response, 200);
  },
};
