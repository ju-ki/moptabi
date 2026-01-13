import { getAuth } from '@hono/clerk-auth';
import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';

import { PrismaClient, NotificationType, Prisma } from '@/generated/prisma';
import { NotificationCreate, NotificationUpdate } from '@/models/notification';

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
  const now = new Date();

  const count = await prisma.userNotification.count({
    where: {
      userId,
      isRead: false,
      notification: {
        publishedAt: { lte: now },
      },
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

/**
 * お知らせを作成する（管理者向け）
 * @param c Honoコンテキスト
 * @param data 作成データ
 */
export async function createNotification(c: Context, data: NotificationCreate) {
  requireAuth(c);

  let responseNotification;
  await prisma.$transaction(async (prisma) => {
    // 全ユーザーのIDを取得
    const users = await prisma.user.findMany({
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type as NotificationType,
        publishedAt: new Date(data.publishedAt),
      },
    });

    // 管理者画面から作成したお知らせは全ユーザーに配信する
    await prisma.userNotification.createMany({
      data: userIds.map((userId) => ({
        userId,
        notificationId: notification.id,
        isRead: false,
      })),
    });

    responseNotification = {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      type: notification.type,
      publishedAt: notification.publishedAt.toISOString(),
      createdAt: notification.createdAt.toISOString(),
    };
  });

  return responseNotification;
}

/**
 * お知らせを更新する（管理者向け）
 * @param c Honoコンテキスト
 * @param notificationId お知らせID
 * @param data 更新データ
 */
export async function updateNotification(c: Context, notificationId: number, data: NotificationUpdate) {
  requireAuth(c);

  // 存在確認
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing) {
    throw new HTTPException(404, { message: 'Notification not found' });
  }

  let responseNotification;

  await prisma.$transaction(async (prisma) => {
    // 全ユーザーのIDを取得
    const users = await prisma.user.findMany({
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        title: data.title,
        content: data.content,
        type: data.type as NotificationType,
        publishedAt: new Date(data.publishedAt),
      },
    });

    // 管理者画面から更新したお知らせは全ユーザーに再配信する
    await Promise.all(
      userIds.map(async (userId) => {
        const userNotification = await prisma.userNotification.findUnique({
          where: {
            userId_notificationId: {
              userId,
              notificationId: notification.id,
            },
          },
        });

        if (userNotification) {
          // 既存のUserNotificationがある場合は未読に更新
          await prisma.userNotification.update({
            where: { id: userNotification.id },
            data: {
              isRead: false,
              readAt: null,
            },
          });
        } else {
          // 存在しない場合は新規作成
          await prisma.userNotification.create({
            data: {
              userId,
              notificationId: notification.id,
              isRead: false,
            },
          });
        }
      }),
    );
    responseNotification = {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      type: notification.type,
      publishedAt: notification.publishedAt.toISOString(),
      createdAt: notification.createdAt.toISOString(),
    };
  });
  return responseNotification;
}

/**
 * お知らせを削除する（管理者向け）
 * 関連するUserNotificationもカスケード削除される
 * @param c Honoコンテキスト
 * @param notificationId お知らせID
 */
export async function deleteNotification(c: Context, notificationId: number) {
  requireAuth(c);

  // 存在確認
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing) {
    throw new HTTPException(404, { message: 'Notification not found' });
  }

  // カスケード削除: UserNotificationも削除される（Prismaスキーマで設定済み）
  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { success: true };
}

/**
 * 管理者向けお知らせ一覧を取得
 * 未来の公開日も含めて全て取得し、既読率情報も含む
 * ページネーション・検索・フィルター・ソート対応
 * @param c Honoコンテキスト
 */
export async function getAdminNotifications(c: Context) {
  const userId = requireAuth(c);

  // 管理者権限以外は403を返す
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

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

  // Prismaのwhere条件を構築
  const where: Prisma.NotificationWhereInput = {};

  if (title) {
    where.title = {
      contains: title,
      mode: 'insensitive',
    };
  }

  if (type) {
    where.type = type;
  }

  if (publishedFrom || publishedTo) {
    where.publishedAt = {};
    if (publishedFrom) {
      where.publishedAt.gte = new Date(publishedFrom);
    }
    if (publishedTo) {
      // publishedToは指定日の終わりまでを含む
      const endDate = new Date(publishedTo);
      endDate.setHours(23, 59, 59, 999);
      where.publishedAt.lte = endDate;
    }
  }

  // 総件数を取得
  const totalCount = await prisma.notification.count({ where });

  // 既読率でソートする場合は全件取得してソート
  let notifications;
  if (sortBy === 'readRate') {
    notifications = await prisma.notification.findMany({
      where,
      include: {
        userNotifications: {
          select: {
            isRead: true,
          },
        },
      },
    });
  } else {
    // publishedAtまたはcreatedAtでソートする場合はPrismaでソート
    notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        userNotifications: {
          select: {
            isRead: true,
          },
        },
      },
    });
  }

  // 既読率を計算してマップ
  const result = notifications.map((n) => {
    const totalRecipients = n.userNotifications.length;
    const readCount = n.userNotifications.filter((un) => un.isRead).length;
    const readRate = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type,
      publishedAt: n.publishedAt,
      createdAt: n.createdAt,
      readRate,
      totalRecipients,
      readCount,
    };
  });

  // 既読率でソートする場合はJavaScriptでソート
  if (sortBy === 'readRate') {
    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.readRate - b.readRate;
      }
      return b.readRate - a.readRate;
    });
  }

  // ページネーション
  const startIndex = (page - 1) * limit;
  const paginatedResult = result.slice(startIndex, startIndex + limit);

  // ページネーション情報を計算
  const totalPages = Math.ceil(totalCount / limit);
  const pagination = {
    currentPage: page,
    totalPages,
    totalCount,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  // 日付をISO文字列に変換
  const formattedNotifications = paginatedResult.map((n) => ({
    ...n,
    publishedAt: n.publishedAt instanceof Date ? n.publishedAt.toISOString() : n.publishedAt,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  }));

  return {
    notifications: formattedNotifications,
    pagination,
  };
}
