import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'bun:test';
import { testClient } from 'hono/testing';
import { getAuth } from '@hono/clerk-auth';

import { NotificationListResponseSchema, UnreadCountResponseSchema } from '@/models/notification';
import { NotificationType } from '@/generated/prisma/client';

import app from '..';
import prismaClient, { clearTestData, connectPrisma, createTestUser, disconnectPrisma } from './prisma';

// 認証用のモックユーザーID
const TEST_USER_ID = 'test_notification_user';

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(),
}));

beforeAll(async () => {
  console.log('Bun test start');
  await connectPrisma();
  await clearTestData();
  await createTestUser(TEST_USER_ID, 'ADMIN');
});

afterAll(async () => {
  await clearTestData();
  await disconnectPrisma();
  console.log('Bun test end');
});

beforeEach(async () => {
  vi.clearAllMocks();
  (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: TEST_USER_ID });

  // 各テスト前にお知らせ関連データをクリア
  await prismaClient.prisma.userNotification.deleteMany({});
  await prismaClient.prisma.notification.deleteMany({});
});

/**
 * テスト用のお知らせを作成するヘルパー関数
 */
async function createTestNotification(data: {
  title: string;
  content: string;
  type?: 'SYSTEM' | 'INFO';
  publishedAt?: Date;
}) {
  return await prismaClient.prisma.notification.create({
    data: {
      title: data.title,
      content: data.content,
      type: data.type ?? 'SYSTEM',
      publishedAt: data.publishedAt ?? new Date(),
    },
  });
}

/**
 * テスト用のユーザーお知らせを作成するヘルパー関数
 */
async function createUserNotification(userId: string, notificationId: number, isRead: boolean = false) {
  return await prismaClient.prisma.userNotification.create({
    data: {
      userId,
      notificationId,
      isRead,
      readAt: isRead ? new Date() : null,
    },
  });
}

describe('🔔 お知らせサービス', () => {
  const client = testClient(app) as any;

  // ---- GET /notification: お知らせ一覧取得 ----
  describe('GET /notification', () => {
    it('お知らせがない場合は空配列を返す', async () => {
      const res = await client.api.notification.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('公開済みのお知らせ一覧を取得できる', async () => {
      // テストデータ作成
      const notification1 = await createTestNotification({
        title: 'お知らせ1',
        content: '内容1',
        type: 'SYSTEM',
        publishedAt: new Date('2025-01-01T00:00:00Z'),
      });
      const notification2 = await createTestNotification({
        title: 'お知らせ2',
        content: '内容2',
        type: 'INFO',
        publishedAt: new Date('2025-01-02T00:00:00Z'),
      });

      // ユーザーお知らせを作成（未読状態）
      await createUserNotification(TEST_USER_ID, notification1.id, false);
      await createUserNotification(TEST_USER_ID, notification2.id, false);

      const res = await client.api.notification.$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      // スキーマバリデーション
      const result = NotificationListResponseSchema.safeParse(data);
      expect(result.success).toBe(true);

      // 公開日時降順でソートされている
      expect(data.length).toBe(2);
      expect(data[0].title).toBe('お知らせ2');
      expect(data[1].title).toBe('お知らせ1');
    });

    it('未来の公開日時のお知らせは取得されない', async () => {
      // 過去のお知らせ
      const pastNotification = await createTestNotification({
        title: '過去のお知らせ',
        content: '公開済み',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
      });
      // 未来のお知らせ
      await createTestNotification({
        title: '未来のお知らせ',
        content: '未公開',
        publishedAt: new Date('2099-01-01T00:00:00Z'),
      });

      await createUserNotification(TEST_USER_ID, pastNotification.id, false);

      const res = await client.api.notification.$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.length).toBe(1);
      expect(data[0].title).toBe('過去のお知らせ');
    });

    it('既読状態が正しく反映される', async () => {
      const notification = await createTestNotification({
        title: '既読テスト',
        content: '内容',
      });
      await createUserNotification(TEST_USER_ID, notification.id, true);

      const res = await client.api.notification.$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data[0].isRead).toBe(true);
      expect(data[0].readAt).not.toBeNull();
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const res = await client.api.notification.$get();

      expect(res.status).toBe(401);
    });
  });

  // ---- GET /notification/unread-count: 未読件数取得 ----
  describe('GET /notification/unread-count', () => {
    it('未読件数が0の場合', async () => {
      const res = await client.api.notification['unread-count'].$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(0);
    });

    it('未読のお知らせ件数を正しく取得できる', async () => {
      const notification1 = await createTestNotification({ title: '未読1', content: '内容' });
      const notification2 = await createTestNotification({ title: '未読2', content: '内容' });
      const notification3 = await createTestNotification({ title: '既読', content: '内容' });

      await createUserNotification(TEST_USER_ID, notification1.id, false);
      await createUserNotification(TEST_USER_ID, notification2.id, false);
      await createUserNotification(TEST_USER_ID, notification3.id, true);

      const res = await client.api.notification['unread-count'].$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      // スキーマバリデーション
      const result = UnreadCountResponseSchema.safeParse(data);
      expect(result.success).toBe(true);

      expect(data.count).toBe(2);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const res = await client.api.notification['unread-count'].$get();

      expect(res.status).toBe(401);
    });
  });

  // ---- POST /notification: お知らせ作成 ----
  describe('POST /notification', () => {
    it('新しいお知らせを作成できる', async () => {
      const payload = {
        title: '新機能リリースのお知らせ',
        content: '新しい機能が追加されました。ぜひお試しください。',
        type: NotificationType.SYSTEM,
        publishedAt: new Date().toLocaleDateString('sv-SE'),
      };

      const res = await client.api.notification.$post({ json: payload });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty('id');
      expect(data.title).toBe(payload.title);
      expect(data.content).toBe(payload.content);
      expect(data.type).toBe(payload.type);

      // DBに保存されていることを確認
      const saved = await prismaClient.prisma.notification.findUnique({
        where: { id: data.id },
      });
      expect(saved).not.toBeNull();
      expect(saved?.title).toBe(payload.title);

      // ユーザー通知の方にもデータが作成されていること
      const userNotification = await prismaClient.prisma.userNotification.findFirst({
        where: { notificationId: data.id },
      });

      expect(userNotification).not.toBeNull();
      expect(userNotification?.isRead).toBe(false);
    });

    it('INFOタイプのお知らせを作成できる', async () => {
      const payload = {
        title: 'お知らせ情報',
        content: '一般的なお知らせ内容です。',
        type: 'INFO' as const,
        publishedAt: new Date().toLocaleDateString('sv-SE'),
      };

      const res = await client.api.notification.$post({ json: payload });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.type).toBe('INFO');
    });

    it('タイトルが空の場合は400エラーを返す', async () => {
      const payload = {
        title: '',
        content: '内容',
        type: 'SYSTEM' as const,
        publishedAt: new Date().toLocaleDateString('sv-SE'),
      };

      const res = await client.api.notification.$post({ json: payload });

      expect(res.status).toBe(400);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const payload = {
        title: 'テスト',
        content: '内容',
        type: 'SYSTEM' as const,
        publishedAt: new Date().toLocaleDateString('sv-SE'),
      };

      const res = await client.api.notification.$post({ json: payload });

      expect(res.status).toBe(401);
    });
  });

  // ---- PATCH /notification/:id/read: 既読にする ----
  describe('PATCH /notification/:id/read', () => {
    it('指定したお知らせを既読にできる', async () => {
      const notification = await createTestNotification({ title: 'テスト', content: '内容' });
      await createUserNotification(TEST_USER_ID, notification.id, false);

      const res = await client.api.notification[':id'].read.$patch({
        param: { id: notification.id.toString() },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // DBで確認
      const updated = await prismaClient.prisma.userNotification.findFirst({
        where: { userId: TEST_USER_ID, notificationId: notification.id },
      });
      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).not.toBeNull();
    });

    it('存在しないお知らせIDの場合は404エラーを返す', async () => {
      const res = await client.api.notification[':id'].read.$patch({
        param: { id: '99999' },
      });

      expect(res.status).toBe(404);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const res = await client.api.notification[':id'].read.$patch({
        param: { id: '1' },
      });

      expect(res.status).toBe(401);
    });
  });

  // ---- PATCH /notification/read-all: 全て既読にする ----
  describe('PATCH /notification/read-all', () => {
    it('全ての未読お知らせを既読にできる', async () => {
      const notification1 = await createTestNotification({ title: '未読1', content: '内容' });
      const notification2 = await createTestNotification({ title: '未読2', content: '内容' });
      const notification3 = await createTestNotification({ title: '既読', content: '内容' });

      await createUserNotification(TEST_USER_ID, notification1.id, false);
      await createUserNotification(TEST_USER_ID, notification2.id, false);
      await createUserNotification(TEST_USER_ID, notification3.id, true);

      const res = await client.api.notification['read-all'].$patch();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(2); // 未読だった2件が更新された

      // DBで確認
      const unreadCount = await prismaClient.prisma.userNotification.count({
        where: { userId: TEST_USER_ID, isRead: false },
      });
      expect(unreadCount).toBe(0);
    });

    it('未読がない場合もエラーにならない', async () => {
      const res = await client.api.notification['read-all'].$patch();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const res = await client.api.notification['read-all'].$patch();

      expect(res.status).toBe(401);
    });
  });

  // ---- PATCH /notification/:id: お知らせ修正 ----
  describe('PATCH /notification/:id', () => {
    it('お知らせのタイトルを更新できる', async () => {
      const notification = await createTestNotification({
        title: '更新前タイトル',
        content: '内容',
      });

      const res = await client.api.notification[':id'].$patch({
        param: { id: notification.id.toString() },
        json: {
          ...notification,
          title: '更新後タイトル',
          publishedAt: new Date(notification.publishedAt).toLocaleDateString('sv-SE'),
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe('更新後タイトル');
      expect(data.content).toBe('内容'); // 変更していないフィールドは保持

      // DBで確認
      const updated = await prismaClient.prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.title).toBe('更新後タイトル');
    });

    it('お知らせの内容を更新できる', async () => {
      const notification = await createTestNotification({
        title: 'タイトル',
        content: '更新前内容',
      });

      const res = await client.api.notification[':id'].$patch({
        param: { id: notification.id.toString() },
        json: {
          ...notification,
          publishedAt: new Date(notification.publishedAt).toLocaleDateString('sv-SE'),
          content: '更新後内容',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content).toBe('更新後内容');
    });

    it('お知らせのタイプを更新できる', async () => {
      const notification = await createTestNotification({
        title: 'タイトル',
        content: '内容',
        type: 'SYSTEM',
      });

      const res = await client.api.notification[':id'].$patch({
        param: { id: notification.id.toString() },
        json: {
          ...notification,
          publishedAt: new Date(notification.publishedAt).toLocaleDateString('sv-SE'),
          type: 'INFO',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.type).toBe('INFO');
    });

    it('お知らせの公開日時を更新できる', async () => {
      const notification = await createTestNotification({
        title: 'タイトル',
        content: '内容',
        publishedAt: new Date('2025-01-01T00:00:00Z'),
      });

      const newPublishedAt = new Date('2025-02-01T00:00:00Z').toLocaleDateString('sv-SE');
      const res = await client.api.notification[':id'].$patch({
        param: { id: notification.id.toString() },
        json: { ...notification, publishedAt: newPublishedAt },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(new Date(data.publishedAt).toLocaleDateString('sv-SE')).toBe(newPublishedAt);
    });

    it('存在しないお知らせIDの場合は404エラーを返す', async () => {
      const res = await client.api.notification[':id'].$patch({
        param: { id: '99999' },
        json: { title: '更新', content: '内容', type: 'SYSTEM', publishedAt: new Date().toLocaleDateString('sv-SE') },
      });

      expect(res.status).toBe(404);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const res = await client.api.notification[':id'].$patch({
        param: { id: '1' },
        json: { title: '更新', content: '内容', type: 'SYSTEM', publishedAt: new Date().toLocaleDateString('sv-SE') },
      });

      expect(res.status).toBe(401);
    });
  });

  // ---- DELETE /notification/:id: お知らせ削除 ----
  describe('DELETE /notification/:id', () => {
    it('お知らせを削除できる', async () => {
      const notification = await createTestNotification({
        title: '削除対象',
        content: '削除されるお知らせ',
      });

      const res = await client.api.notification[':id'].$delete({
        param: { id: notification.id.toString() },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // DBから削除されていることを確認
      const deleted = await prismaClient.prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(deleted).toBeNull();
    });

    it('お知らせ削除時に関連するUserNotificationも削除される', async () => {
      const notification = await createTestNotification({
        title: '関連データ削除テスト',
        content: '内容',
      });
      await createUserNotification(TEST_USER_ID, notification.id, false);

      // 事前確認: UserNotificationが存在する
      const beforeCount = await prismaClient.prisma.userNotification.count({
        where: { notificationId: notification.id },
      });
      expect(beforeCount).toBe(1);

      const res = await client.api.notification[':id'].$delete({
        param: { id: notification.id.toString() },
      });

      expect(res.status).toBe(200);

      // 関連するUserNotificationも削除されていることを確認
      const afterCount = await prismaClient.prisma.userNotification.count({
        where: { notificationId: notification.id },
      });
      expect(afterCount).toBe(0);
    });

    it('存在しないお知らせIDの場合は404エラーを返す', async () => {
      const res = await client.api.notification[':id'].$delete({
        param: { id: '99999' },
      });

      expect(res.status).toBe(404);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const res = await client.api.notification[':id'].$delete({
        param: { id: '1' },
      });

      expect(res.status).toBe(401);
    });
  });

  // ---- GET /notification/admin: 管理者向けお知らせ一覧取得 ----
  describe('GET /notification/admin', () => {
    it('管理者向けにお知らせ一覧を取得できる（未来の公開日含む）', async () => {
      // 過去のお知らせ
      await createTestNotification({
        title: '過去のお知らせ',
        content: '公開済み',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
      });
      // 未来のお知らせ
      await createTestNotification({
        title: '未来のお知らせ',
        content: '未公開',
        publishedAt: new Date('2099-01-01T00:00:00Z'),
      });

      const res = await client.api.notification.admin.$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      // 管理者向けは未来の公開日も含めて全て取得（ページネーション形式）
      expect(data.notifications.length).toBe(2);
      expect(data.pagination.totalCount).toBe(2);
    });

    it('公開日時降順でソートされている', async () => {
      await createTestNotification({
        title: '古いお知らせ',
        content: '内容',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
      });
      await createTestNotification({
        title: '新しいお知らせ',
        content: '内容',
        publishedAt: new Date('2025-06-01T00:00:00Z'),
      });

      const res = await client.api.notification.admin.$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.notifications[0].title).toBe('新しいお知らせ');
      expect(data.notifications[1].title).toBe('古いお知らせ');
    });

    it('各お知らせの既読率を取得できる', async () => {
      const notification = await createTestNotification({
        title: '既読率テスト',
        content: '内容',
      });

      // 2人のユーザーを作成、1人は既読、1人は未読
      const user2 = 'test_user_2';
      await prismaClient.prisma.user.upsert({
        where: { id: user2 },
        update: {},
        create: { id: user2 },
      });

      await createUserNotification(TEST_USER_ID, notification.id, true); // 既読
      await createUserNotification(user2, notification.id, false); // 未読

      const res = await client.api.notification.admin.$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      const targetNotification = data.notifications.find((n: any) => n.id === notification.id);
      expect(targetNotification).toBeDefined();
      expect(targetNotification.readRate).toBe(50); // 50%既読
      expect(targetNotification.totalRecipients).toBe(2);
      expect(targetNotification.readCount).toBe(1);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const res = await client.api.notification.admin.$get();

      expect(res.status).toBe(401);
    });
  });
});
