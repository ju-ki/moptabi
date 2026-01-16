import { Context } from 'hono';

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  updateNotification,
  deleteNotification,
  getAdminNotifications,
} from '@/services/notification';
import { NotificationCreateSchema, NotificationUpdateSchema } from '@/models/notification';

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

  /**
   * お知らせを作成する（管理者向け）
   */
  createNotification: async (c: Context) => {
    const body = await c.req.json();
    const result = NotificationCreateSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Validation error' }, 400);
    }

    const response = await createNotification(c, result.data);
    return c.json(response, 201);
  },

  /**
   * お知らせを更新する（管理者向け）
   */
  updateNotification: async (c: Context) => {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }

    const body = await c.req.json();
    const result = NotificationUpdateSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Validation error' }, 400);
    }

    const response = await updateNotification(c, id, result.data);
    return c.json(response, 200);
  },

  /**
   * お知らせを削除する（管理者向け）
   */
  deleteNotification: async (c: Context) => {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }

    const response = await deleteNotification(c, id);
    return c.json(response, 200);
  },

  /**
   * 管理者向けお知らせ一覧を取得
   */
  getAdminNotifications: async (c: Context) => {
    const response = await getAdminNotifications(c);
    return c.json(response, 200);
  },
};
