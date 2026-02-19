import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';
import { eq, and, lte, count, desc, asc } from 'drizzle-orm';
import { db, notification, userNotification, user } from '@db';

import { NotificationCreate, NotificationUpdate } from '@/models/notification';
import { getUserId } from '@/middleware/auth';

/**
 * お知らせサービス
 * 将来的にリアルタイム通知（WebSocket/SSE）への移行を考慮した設計
 */

/**
 * タイムスタンプをISO 8601形式（Z付き）に変換するヘルパー
 */
const toISOWithZ = (timestamp: string | null | undefined): string | null => {
  if (!timestamp) return null;
  // すでにZが付いている場合はそのまま返す
  if (timestamp.endsWith('Z')) return timestamp;
  // タイムゾーン情報がない場合はZを追加
  return timestamp + 'Z';
};

/**
 * お知らせ一覧を取得
 */
export async function getNotifications(c: Context) {
  const userId = getUserId(c);
  const now = new Date().toISOString();

  // userNotificationを取得してnotificationと結合
  const rows = await db.query.userNotification.findMany({
    where: eq(userNotification.userId, userId),
    with: {
      notification: true,
    },
  });

  // 公開日時でフィルタリングしてソート
  const filtered = rows
    .filter((un) => un.notification && un.notification.publishedAt <= now)
    .sort((a, b) => {
      const dateA = a.notification?.publishedAt || '';
      const dateB = b.notification?.publishedAt || '';
      return dateB.localeCompare(dateA);
    });

  return filtered.map((un) => ({
    id: un.notification.id,
    title: un.notification.title,
    content: un.notification.content,
    type: un.notification.type,
    publishedAt: toISOWithZ(un.notification.publishedAt),
    createdAt: toISOWithZ(un.notification.createdAt),
    isRead: un.isRead,
    readAt: toISOWithZ(un.readAt),
  }));
}

/**
 * 未読件数を取得
 */
export async function getUnreadCount(c: Context) {
  const userId = getUserId(c);
  const now = new Date();

  // userNotificationとnotificationをjoinして未読をカウント
  const rows = await db
    .select({ count: count() })
    .from(userNotification)
    .innerJoin(notification, eq(userNotification.notificationId, notification.id))
    .where(
      and(
        eq(userNotification.userId, userId),
        eq(userNotification.isRead, false),
        lte(notification.publishedAt, now.toISOString()),
      ),
    );

  return { count: rows[0]?.count ?? 0 };
}

/**
 * 指定したお知らせを既読にする
 */
export async function markAsRead(c: Context, notificationId: number) {
  const userId = getUserId(c);

  const [existing] = await db
    .select()
    .from(userNotification)
    .where(and(eq(userNotification.userId, userId), eq(userNotification.notificationId, notificationId)))
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: 'Notification not found' });
  }

  await db
    .update(userNotification)
    .set({
      isRead: true,
      readAt: new Date().toISOString(),
    })
    .where(eq(userNotification.id, existing.id));

  return { success: true };
}

/**
 * 全ての未読お知らせを既読にする
 */
export async function markAllAsRead(c: Context) {
  const userId = getUserId(c);

  const result = await db
    .update(userNotification)
    .set({
      isRead: true,
      readAt: new Date().toISOString(),
    })
    .where(and(eq(userNotification.userId, userId), eq(userNotification.isRead, false)))
    .returning();

  return {
    success: true,
    count: result.length,
  };
}

/**
 * お知らせを作成する（管理者向け）
 */
export async function createNotification(c: Context, data: NotificationCreate) {
  getUserId(c);

  // 全ユーザーのIDを取得
  const users = await db.select({ id: user.id }).from(user);
  const userIds = users.map((u) => u.id);

  // publishedAtをISO文字列に変換
  const publishedAtStr = data.publishedAt instanceof Date ? data.publishedAt.toISOString() : data.publishedAt;

  // お知らせを作成
  const [newNotification] = await db
    .insert(notification)
    .values({
      title: data.title,
      content: data.content,
      type: data.type as 'SYSTEM' | 'INFO',
      publishedAt: publishedAtStr,
    })
    .returning();

  // 全ユーザーにUserNotificationを作成
  if (userIds.length > 0) {
    await db.insert(userNotification).values(
      userIds.map((userId) => ({
        userId,
        notificationId: newNotification.id,
        isRead: false,
      })),
    );
  }

  return {
    id: newNotification.id,
    title: newNotification.title,
    content: newNotification.content,
    type: newNotification.type,
    publishedAt: toISOWithZ(newNotification.publishedAt),
    createdAt: toISOWithZ(newNotification.createdAt),
  };
}

/**
 * お知らせを更新する（管理者向け）
 */
export async function updateNotification(c: Context, notificationId: number, data: NotificationUpdate) {
  getUserId(c);

  // 存在確認
  const [existing] = await db.select().from(notification).where(eq(notification.id, notificationId)).limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: 'Notification not found' });
  }

  // publishedAtをISO文字列に変換
  const publishedAtStr = data.publishedAt instanceof Date ? data.publishedAt.toISOString() : data.publishedAt;

  // お知らせを更新
  const [updated] = await db
    .update(notification)
    .set({
      title: data.title,
      content: data.content,
      type: data.type as 'SYSTEM' | 'INFO',
      publishedAt: publishedAtStr,
    })
    .where(eq(notification.id, notificationId))
    .returning();

  // 全ユーザーのUserNotificationを未読に更新または作成
  const users = await db.select({ id: user.id }).from(user);

  for (const u of users) {
    const [existingUn] = await db
      .select()
      .from(userNotification)
      .where(and(eq(userNotification.userId, u.id), eq(userNotification.notificationId, notificationId)))
      .limit(1);

    if (existingUn) {
      await db
        .update(userNotification)
        .set({ isRead: false, readAt: null })
        .where(eq(userNotification.id, existingUn.id));
    } else {
      await db.insert(userNotification).values({
        userId: u.id,
        notificationId,
        isRead: false,
      });
    }
  }

  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    type: updated.type,
    publishedAt: toISOWithZ(updated.publishedAt),
    createdAt: toISOWithZ(updated.createdAt),
  };
}

/**
 * お知らせを削除する（管理者向け）
 */
export async function deleteNotification(c: Context, notificationId: number) {
  getUserId(c);

  const [existing] = await db.select().from(notification).where(eq(notification.id, notificationId)).limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: 'Notification not found' });
  }

  // UserNotificationを先に削除（外部キー制約のため）
  await db.delete(userNotification).where(eq(userNotification.notificationId, notificationId));

  await db.delete(notification).where(eq(notification.id, notificationId));

  return { success: true };
}

/**
 * 管理者向けお知らせ一覧を取得
 */
export async function getAdminNotifications(c: Context) {
  const userId = getUserId(c);

  // 管理者権限チェック
  const [targetUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

  if (targetUser?.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  // クエリパラメータを取得
  const query = c.req.query() as Record<string, string | undefined>;
  const page = parseInt(query.page || '1', 10);
  const limit = Math.min(parseInt(query.limit || '20', 10), 100);
  const title = query.title;
  const type = query.type as 'SYSTEM' | 'INFO' | undefined;
  const publishedFrom = query.publishedFrom;
  const publishedTo = query.publishedTo;
  const sortBy = (query.sortBy as 'publishedAt' | 'createdAt' | 'readRate') || 'publishedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  // 全お知らせを取得してフィルタリング
  let notifications = await db.query.notification.findMany({
    with: {
      userNotifications: {
        columns: {
          isRead: true,
        },
      },
    },
  });

  // ソート
  if (sortBy !== 'readRate') {
    notifications = notifications.sort((a, b) => {
      const dateA = sortBy === 'publishedAt' ? a.publishedAt : a.createdAt;
      const dateB = sortBy === 'publishedAt' ? b.publishedAt : b.createdAt;
      const cmp = (dateB || '').localeCompare(dateA || '');
      return sortOrder === 'asc' ? -cmp : cmp;
    });
  }

  // フィルタリング
  if (title) {
    notifications = notifications.filter((n) => n.title.toLowerCase().includes(title.toLowerCase()));
  }
  if (type) {
    notifications = notifications.filter((n) => n.type === type);
  }
  if (publishedFrom) {
    const fromDate = new Date(publishedFrom);
    notifications = notifications.filter((n) => new Date(n.publishedAt) >= fromDate);
  }
  if (publishedTo) {
    const toDate = new Date(publishedTo);
    toDate.setHours(23, 59, 59, 999);
    notifications = notifications.filter((n) => new Date(n.publishedAt) <= toDate);
  }

  const totalCount = notifications.length;

  // 既読率を計算
  const result = notifications.map((n) => {
    const totalRecipients = n.userNotifications.length;
    const readCount = n.userNotifications.filter((un) => un.isRead).length;
    const readRate = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type,
      publishedAt: toISOWithZ(n.publishedAt),
      createdAt: toISOWithZ(n.createdAt),
      readRate,
      totalRecipients,
      readCount,
    };
  });

  // 既読率でソート
  if (sortBy === 'readRate') {
    result.sort((a, b) => (sortOrder === 'asc' ? a.readRate - b.readRate : b.readRate - a.readRate));
  }

  // ページネーション
  const startIndex = (page - 1) * limit;
  const paginatedResult = result.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    notifications: paginatedResult,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
