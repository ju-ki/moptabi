import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'bun:test';
import { testClient } from 'hono/testing';
import { getAuth } from '@hono/clerk-auth';

import { NotificationListResponseSchema, UnreadCountResponseSchema } from '@/models/notification';

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
  await createTestUser(TEST_USER_ID);
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
});
