import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'bun:test';
import { testClient } from 'hono/testing';

import app from '..';
import prismaClient, { clearTestDataForUser, connectPrisma, createTestUser, disconnectPrisma } from './prisma';

// 認証用のモックユーザーID
const ADMIN_USER_ID = 'admin_user_id_notification';
const NORMAL_USER_ID = 'normal_user_id_notification';

// 現在の認証ユーザーIDを保持する変数
let currentUserId: string | null = ADMIN_USER_ID;

// 認証ヘッダーを生成するヘルパー関数
function getAuthHeaders(): Record<string, string> {
  if (!currentUserId) {
    return {};
  }
  return { 'X-User-Id': currentUserId };
}

beforeAll(async () => {
  await connectPrisma();
  await clearTestDataForUser(ADMIN_USER_ID);
  await clearTestDataForUser(NORMAL_USER_ID);
  await createTestUser(ADMIN_USER_ID, 'ADMIN');
  await createTestUser(NORMAL_USER_ID, 'USER');
});

afterAll(async () => {
  await clearTestDataForUser(ADMIN_USER_ID);
  await clearTestDataForUser(NORMAL_USER_ID);
  await disconnectPrisma();
});

beforeEach(async () => {
  currentUserId = ADMIN_USER_ID;

  // お知らせデータをクリア
  await prismaClient.prisma.userNotification.deleteMany();
  await prismaClient.prisma.notification.deleteMany();
});

// テスト用お知らせデータを作成するヘルパー関数
async function createTestNotifications(count: number, options?: { type?: 'SYSTEM' | 'INFO' }) {
  const notifications = [];
  for (let i = 0; i < count; i++) {
    const notification = await prismaClient.prisma.notification.create({
      data: {
        title: `テストお知らせ ${i + 1}`,
        content: `テスト内容 ${i + 1}`,
        type: options?.type || (i % 2 === 0 ? 'SYSTEM' : 'INFO'),
        publishedAt: new Date(Date.now() - i * 86400000).toISOString(), // i日前
        createdAt: new Date(Date.now() - i * 86400000),
      },
    });
    notifications.push(notification);
  }
  return notifications;
}

describe('🧾 お知らせ管理APIサービス - ページネーション・検索・ソート', () => {
  const client = testClient(app) as any;

  describe('GET /api/notification/admin', () => {
    it('管理者以外はアクセス拒否される（403）', async () => {
      currentUserId = NORMAL_USER_ID;

      const response = await client.api.notification.admin.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(403);
    });

    it('未認証の場合は401を返す', async () => {
      currentUserId = null;

      const response = await client.api.notification.admin.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(401);
    });

    it('管理者はアクセスできる（200）', async () => {
      currentUserId = ADMIN_USER_ID;

      const response = await client.api.notification.admin.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/notification/admin - ページネーション', () => {
    it('デフォルトのページネーション設定でレスポンスを返す', async () => {
      currentUserId = ADMIN_USER_ID;

      // 25件のお知らせを作成
      await createTestNotifications(25);

      const response = await client.api.notification.admin.$get({}, { headers: getAuthHeaders() });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination.currentPage).toBe(1);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.totalCount).toBe(25);
      expect(data.pagination.totalPages).toBe(2);
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.hasPrevPage).toBe(false);
      expect(data.notifications.length).toBe(20);
    });

    it('ページ番号を指定してページネーションできる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(25);

      const response = await client.api.notification.admin.$get(
        {
          query: { page: '2' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.currentPage).toBe(2);
      expect(data.pagination.hasNextPage).toBe(false);
      expect(data.pagination.hasPrevPage).toBe(true);
      expect(data.notifications.length).toBe(5);
    });

    it('1ページあたりの件数を指定できる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(15);

      const response = await client.api.notification.admin.$get(
        {
          query: { limit: '10' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(2);
      expect(data.notifications.length).toBe(10);
    });

    it('空のページを取得した場合は空配列を返す', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(5);

      const response = await client.api.notification.admin.$get(
        {
          query: { page: '10' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications.length).toBe(0);
      expect(data.pagination.currentPage).toBe(10);
    });
  });

  describe('GET /api/notification/admin - 検索/フィルター', () => {
    it('タイトルで検索できる', async () => {
      currentUserId = ADMIN_USER_ID;

      // 特定のタイトルのお知らせを作成
      await prismaClient.prisma.notification.create({
        data: {
          title: 'システムメンテナンスのお知らせ',
          content: 'システムメンテナンスを実施します',
          type: 'SYSTEM',
          publishedAt: new Date().toISOString(),
        },
      });
      await prismaClient.prisma.notification.create({
        data: {
          title: '新機能リリースのお知らせ',
          content: '新機能をリリースしました',
          type: 'INFO',
          publishedAt: new Date().toISOString(),
        },
      });

      const response = await client.api.notification.admin.$get(
        {
          query: { title: 'システム' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications.length).toBe(1);
      expect(data.notifications[0].title).toContain('システム');
    });

    it('タイプでフィルターできる（SYSTEM）', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(10); // 5件 SYSTEM, 5件 INFO

      const response = await client.api.notification.admin.$get(
        {
          query: { type: 'SYSTEM' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications.every((n: any) => n.type === 'SYSTEM')).toBe(true);
    });

    it('タイプでフィルターできる（INFO）', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(10);

      const response = await client.api.notification.admin.$get(
        {
          query: { type: 'INFO' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications.every((n: any) => n.type === 'INFO')).toBe(true);
    });

    it('公開日の範囲でフィルターできる', async () => {
      currentUserId = ADMIN_USER_ID;

      // 異なる日付のお知らせを作成
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);

      await prismaClient.prisma.notification.create({
        data: {
          title: '今日のお知らせ',
          content: 'テスト',
          type: 'INFO',
          publishedAt: today.toISOString(),
        },
      });
      await prismaClient.prisma.notification.create({
        data: {
          title: '昨日のお知らせ',
          content: 'テスト',
          type: 'INFO',
          publishedAt: yesterday.toISOString(),
        },
      });
      await prismaClient.prisma.notification.create({
        data: {
          title: '2日前のお知らせ',
          content: 'テスト',
          type: 'INFO',
          publishedAt: twoDaysAgo.toISOString(),
        },
      });

      const response = await client.api.notification.admin.$get(
        {
          query: {
            publishedFrom: yesterday.toISOString().split('T')[0],
            publishedTo: today.toISOString().split('T')[0],
          },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications.length).toBe(2);
    });

    it('AND検索: タイトルとタイプを組み合わせてフィルターできる', async () => {
      currentUserId = ADMIN_USER_ID;

      await prismaClient.prisma.notification.create({
        data: {
          title: 'システムメンテナンス',
          content: 'テスト',
          type: 'SYSTEM',
          publishedAt: new Date().toISOString(),
        },
      });
      await prismaClient.prisma.notification.create({
        data: {
          title: 'システム関連のお知らせ',
          content: 'テスト',
          type: 'INFO',
          publishedAt: new Date().toISOString(),
        },
      });
      await prismaClient.prisma.notification.create({
        data: {
          title: '新機能リリース',
          content: 'テスト',
          type: 'SYSTEM',
          publishedAt: new Date().toISOString(),
        },
      });

      const response = await client.api.notification.admin.$get(
        {
          query: { title: 'システム', type: 'SYSTEM' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications.length).toBe(1);
      expect(data.notifications[0].title).toBe('システムメンテナンス');
      expect(data.notifications[0].type).toBe('SYSTEM');
    });
  });

  describe('GET /api/notification/admin - ソート', () => {
    it('公開日時の降順でソートできる（デフォルト）', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(5);

      const response = await client.api.notification.admin.$get(
        {
          query: { sortBy: 'publishedAt', sortOrder: 'desc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      // 降順でソートされていることを確認（新しい方が先）
      for (let i = 0; i < data.notifications.length - 1; i++) {
        const current = new Date(data.notifications[i].publishedAt).getTime();
        const next = new Date(data.notifications[i + 1].publishedAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('公開日時の昇順でソートできる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(5);

      const response = await client.api.notification.admin.$get(
        {
          query: { sortBy: 'publishedAt', sortOrder: 'asc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      // 昇順でソートされていることを確認（古い方が先）
      for (let i = 0; i < data.notifications.length - 1; i++) {
        const current = new Date(data.notifications[i].publishedAt).getTime();
        const next = new Date(data.notifications[i + 1].publishedAt).getTime();
        expect(current).toBeLessThanOrEqual(next);
      }
    });

    it('作成日時でソートできる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestNotifications(5);

      const response = await client.api.notification.admin.$get(
        {
          query: { sortBy: 'createdAt', sortOrder: 'desc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      for (let i = 0; i < data.notifications.length - 1; i++) {
        const current = new Date(data.notifications[i].createdAt).getTime();
        const next = new Date(data.notifications[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('既読率でソートできる', async () => {
      currentUserId = ADMIN_USER_ID;

      // お知らせを作成し、異なる既読率を設定
      const notification1 = await prismaClient.prisma.notification.create({
        data: {
          title: 'お知らせ1',
          content: 'テスト',
          type: 'INFO',
          publishedAt: new Date().toISOString(),
        },
      });
      const notification2 = await prismaClient.prisma.notification.create({
        data: {
          title: 'お知らせ2',
          content: 'テスト',
          type: 'INFO',
          publishedAt: new Date().toISOString(),
        },
      });

      // ユーザーがお知らせ1を既読にする
      await prismaClient.prisma.userNotification.create({
        data: {
          userId: NORMAL_USER_ID,
          notificationId: notification1.id,
          readAt: new Date(),
        },
      });

      const response = await client.api.notification.admin.$get(
        {
          query: { sortBy: 'readRate', sortOrder: 'desc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/notification/admin - 複合パラメータ', () => {
    it('ページネーション、フィルター、ソートを組み合わせて使用できる', async () => {
      currentUserId = ADMIN_USER_ID;

      // 30件のSYSTEMお知らせを作成
      await createTestNotifications(30, { type: 'SYSTEM' });

      const response = await client.api.notification.admin.$get(
        {
          query: {
            page: '1',
            limit: '10',
            type: 'SYSTEM',
            sortBy: 'publishedAt',
            sortOrder: 'asc',
          },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination.limit).toBe(10);
      expect(data.notifications.every((n: any) => n.type === 'SYSTEM')).toBe(true);
      // 昇順ソートを確認
      for (let i = 0; i < data.notifications.length - 1; i++) {
        const current = new Date(data.notifications[i].publishedAt).getTime();
        const next = new Date(data.notifications[i + 1].publishedAt).getTime();
        expect(current).toBeLessThanOrEqual(next);
      }
    });
  });
});
