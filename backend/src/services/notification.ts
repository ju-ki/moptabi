import { getAuth } from '@hono/clerk-auth';
import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';

import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

/**
 * お知らせサービス
 * 将来的にリアルタイム通知（WebSocket/SSE）への移行を考慮した設計
 *
 * 設計思想:
 * - お知らせ本体（Notification）とユーザーごとの既読状態（UserNotification）を分離
 * - 全ユーザー向けのお知らせは Notification に1レコードのみ
 * - 既読状態は UserNotification でユーザーごとに管理
 * - リアルタイム化時は、新規お知らせ作成時にWebSocket/SSEでプッシュ可能
 */

/**
 * 認証チェックユーティリティ
 * @param c Honoコンテキスト
 * @returns ユーザーID
 * @throws 認証エラー時にHTTPException(401)
 */
function requireAuth(c: Context): string {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  return auth.userId;
}

/**
 * お知らせ一覧を取得
 * - 公開日時が現在以前のお知らせのみを取得
 * - ユーザーに紐づくUserNotificationがない場合は未読扱い
 * - 公開日時の降順でソート
 */
export async function getNotifications(c: Context) {
  const userId = requireAuth(c);
  const now = new Date();

  // ユーザーに紐づくお知らせを取得
  // UserNotificationが存在するものを取得
  const userNotifications = await prisma.userNotification.findMany({
    where: {
      userId,
      notification: {
        publishedAt: { lte: now },
      },
    },
    include: {
      notification: true,
    },
    orderBy: {
      notification: {
        publishedAt: 'desc',
      },
    },
  });

  // レスポンス形式に変換
  return userNotifications.map((un) => ({
    id: un.notification.id,
    title: un.notification.title,
    content: un.notification.content,
    type: un.notification.type,
    publishedAt: un.notification.publishedAt.toISOString(),
    createdAt: un.notification.createdAt.toISOString(),
    isRead: un.isRead,
    readAt: un.readAt ? un.readAt.toISOString() : null,
  }));
}

/**
 * 未読件数を取得
 * ヘッダーのバッジ表示などで使用
 */
export async function getUnreadCount(c: Context) {
  const userId = requireAuth(c);

  const count = await prisma.userNotification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { count };
}

/**
 * 指定したお知らせを既読にする
 * @param c Honoコンテキスト
 * @param notificationId お知らせID
 */
export async function markAsRead(c: Context, notificationId: number) {
  const userId = requireAuth(c);

  // UserNotificationの存在確認
  const userNotification = await prisma.userNotification.findUnique({
    where: {
      userId_notificationId: {
        userId,
        notificationId,
      },
    },
  });

  if (!userNotification) {
    throw new HTTPException(404, { message: 'Notification not found' });
  }

  // 既読に更新
  await prisma.userNotification.update({
    where: {
      id: userNotification.id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true };
}

/**
 * 全ての未読お知らせを既読にする
 * 一括既読機能で使用
 */
export async function markAllAsRead(c: Context) {
  const userId = requireAuth(c);

  const result = await prisma.userNotification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    success: true,
    count: result.count,
  };
}

/**
 * 新しいお知らせをユーザーに配信する
 * 管理画面からお知らせを作成した際に呼び出される想定
 * 将来的にはWebSocket/SSEでリアルタイムプッシュも可能
 *
 * @param notificationId お知らせID
 * @param userIds 配信対象のユーザーID配列（空の場合は全ユーザー）
 */
export async function distributeNotification(notificationId: number, userIds?: string[]) {
  // 対象ユーザーを取得
  const targetUsers = userIds?.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } } })
    : await prisma.user.findMany();

  // UserNotificationを一括作成
  await prisma.userNotification.createMany({
    data: targetUsers.map((user) => ({
      userId: user.id,
      notificationId,
      isRead: false,
    })),
    skipDuplicates: true,
  });

  // TODO: リアルタイム通知の実装時
  // WebSocket/SSEを使用して接続中のユーザーにプッシュ通知を送信
  // 例: broadcastToUsers(targetUsers.map(u => u.id), { type: 'NEW_NOTIFICATION', notificationId })
}
