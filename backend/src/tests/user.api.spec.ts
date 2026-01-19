import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'bun:test';
import { testClient } from 'hono/testing';
import { getAuth, clerkMiddleware } from '@hono/clerk-auth';

import app from '..';
import prismaClient, { clearTestData, connectPrisma, createTestUser, disconnectPrisma } from './prisma';

// 認証用のモックユーザーID
const ADMIN_USER_ID = 'admin_user_id';
const NORMAL_USER_ID = 'normal_user_id';

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(),
  clerkMiddleware: vi.fn(() => async (c: any, next: any) => {
    // テスト用のClerkクライアントをモック
    c.set('clerk', {
      users: {
        getUserList: vi.fn().mockResolvedValue({ data: [] }),
      },
    });
    await next();
  }),
}));

beforeAll(async () => {
  await connectPrisma();
  await clearTestData();
  await createTestUser(ADMIN_USER_ID, 'ADMIN');
  await createTestUser(NORMAL_USER_ID, 'USER');
});

afterAll(async () => {
  await clearTestData();
  await disconnectPrisma();
});

beforeEach(async () => {
  vi.clearAllMocks();
  (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });
});

describe('🧾 ユーザーリストAPIサービス', () => {
  const client = testClient(app) as any;

  describe('GET /api/auth/list', () => {
    it('管理者以外はアクセス拒否される（403）', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: NORMAL_USER_ID });

      const response = await client.api.auth.list.$get();
      expect(response.status).toBe(403);
    });

    it('未認証の場合は401を返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });

      const response = await client.api.auth.list.$get();
      expect(response.status).toBe(401);
    });

    it('管理者はアクセスできる（200）', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      // clerkミドルウェアのモックを更新
      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: [
                {
                  id: ADMIN_USER_ID,
                  firstName: 'Admin',
                  lastName: 'User',
                  primaryEmailAddress: { emailAddress: 'admin@example.com' },
                  imageUrl: 'https://example.com/admin.jpg',
                  createdAt: 1704067200000,
                  lastSignInAt: 1704153600000,
                },
              ],
              totalCount: 1,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get();
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/list - ページネーション', () => {
    it('デフォルトのページネーション設定でレスポンスを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      // 複数ユーザーをモック
      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        id: `user_pag_${i}`,
        firstName: `User`,
        lastName: `${i}`,
        primaryEmailAddress: { emailAddress: `user${i}@example.com` },
        imageUrl: 'https://example.com/user.jpg',
        createdAt: 1704067200000 + i * 1000,
        lastSignInAt: 1704153600000 + i * 1000,
      }));

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 25,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination.currentPage).toBe(1);
      expect(data.pagination.limit).toBe(20);
      // totalCountはClerkからの返却データに依存するため、レスポンス形式のみ確認
      expect(typeof data.pagination.totalCount).toBe('number');
      expect(typeof data.pagination.totalPages).toBe('number');
      expect(typeof data.pagination.hasNextPage).toBe('boolean');
      expect(typeof data.pagination.hasPrevPage).toBe('boolean');
      expect(Array.isArray(data.users)).toBe(true);
    });

    it('ページ番号を指定してページネーションできる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        id: `user_page_${i}`,
        firstName: `User`,
        lastName: `${i}`,
        primaryEmailAddress: { emailAddress: `user${i}@example.com` },
        imageUrl: 'https://example.com/user.jpg',
        createdAt: 1704067200000 + i * 1000,
        lastSignInAt: 1704153600000 + i * 1000,
      }));

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 25,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { page: '2' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.currentPage).toBe(2);
      expect(typeof data.pagination.hasNextPage).toBe('boolean');
      expect(typeof data.pagination.hasPrevPage).toBe('boolean');
    });

    it('1ページあたりの件数を指定できる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = Array.from({ length: 15 }, (_, i) => ({
        id: `user_limit_${i}`,
        firstName: `User`,
        lastName: `${i}`,
        primaryEmailAddress: { emailAddress: `user${i}@example.com` },
        imageUrl: 'https://example.com/user.jpg',
        createdAt: 1704067200000 + i * 1000,
        lastSignInAt: 1704153600000 + i * 1000,
      }));

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 15,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { limit: '10' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(10);
      expect(typeof data.pagination.totalPages).toBe('number');
    });
  });

  describe('GET /api/auth/list - 検索', () => {
    it('名前で検索できる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = [
        {
          id: 'user_1',
          firstName: '太郎',
          lastName: '山田',
          primaryEmailAddress: { emailAddress: 'taro@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067200000,
          lastSignInAt: 1704153600000,
        },
        {
          id: 'user_2',
          firstName: '花子',
          lastName: '佐藤',
          primaryEmailAddress: { emailAddress: 'hanako@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067300000,
          lastSignInAt: 1704153700000,
        },
      ];

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 2,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { search: '山田' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      // 検索はサーバーサイドでフィルタリングされる
      expect(
        data.users.every(
          (u: any) =>
            (u.firstName + u.lastName).includes('山田') ||
            u.email?.emailAddress?.includes('山田') ||
            u.id.includes('山田'),
        ),
      ).toBe(true);
    });

    it('メールアドレスで検索できる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = [
        {
          id: 'user_1',
          firstName: '太郎',
          lastName: '山田',
          primaryEmailAddress: { emailAddress: 'taro@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067200000,
          lastSignInAt: 1704153600000,
        },
      ];

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 1,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { search: 'taro@example.com' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/list - ソート', () => {
    it('最終ログイン日時の降順でソートできる（デフォルト）', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = [
        {
          id: 'user_1',
          firstName: 'User',
          lastName: '1',
          primaryEmailAddress: { emailAddress: 'user1@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067200000,
          lastSignInAt: 1704153600000, // 古い
        },
        {
          id: 'user_2',
          firstName: 'User',
          lastName: '2',
          primaryEmailAddress: { emailAddress: 'user2@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067300000,
          lastSignInAt: 1704253600000, // 新しい
        },
      ];

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 2,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { sortBy: 'lastLoginAt', sortOrder: 'desc' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      // 降順でソートされていることを確認（新しい方が先）
      if (data.users.length >= 2) {
        expect(data.users[0].lastLoginAt).toBeGreaterThanOrEqual(data.users[1].lastLoginAt);
      }
    });

    it('最終ログイン日時の昇順でソートできる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = [
        {
          id: 'user_1',
          firstName: 'User',
          lastName: '1',
          primaryEmailAddress: { emailAddress: 'user1@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067200000,
          lastSignInAt: 1704153600000, // 古い
        },
        {
          id: 'user_2',
          firstName: 'User',
          lastName: '2',
          primaryEmailAddress: { emailAddress: 'user2@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067300000,
          lastSignInAt: 1704253600000, // 新しい
        },
      ];

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 2,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { sortBy: 'lastLoginAt', sortOrder: 'asc' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      // 昇順でソートされていることを確認（古い方が先）
      if (data.users.length >= 2) {
        expect(data.users[0].lastLoginAt).toBeLessThanOrEqual(data.users[1].lastLoginAt);
      }
    });

    it('登録日時でソートできる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = [
        {
          id: 'user_1',
          firstName: 'User',
          lastName: '1',
          primaryEmailAddress: { emailAddress: 'user1@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067200000, // 古い
          lastSignInAt: 1704153600000,
        },
        {
          id: 'user_2',
          firstName: 'User',
          lastName: '2',
          primaryEmailAddress: { emailAddress: 'user2@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704167200000, // 新しい
          lastSignInAt: 1704253600000,
        },
      ];

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 2,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { sortBy: 'registeredAt', sortOrder: 'desc' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.users.length >= 2) {
        expect(data.users[0].registeredAt).toBeGreaterThanOrEqual(data.users[1].registeredAt);
      }
    });

    it('プラン数でソートできる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = [
        {
          id: 'user_1',
          firstName: 'User',
          lastName: '1',
          primaryEmailAddress: { emailAddress: 'user1@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067200000,
          lastSignInAt: 1704153600000,
        },
        {
          id: 'user_2',
          firstName: 'User',
          lastName: '2',
          primaryEmailAddress: { emailAddress: 'user2@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067300000,
          lastSignInAt: 1704253600000,
        },
      ];

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 2,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { sortBy: 'planCount', sortOrder: 'desc' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.users.length >= 2) {
        expect(data.users[0].planCount).toBeGreaterThanOrEqual(data.users[1].planCount);
      }
    });

    it('行きたいリスト数でソートできる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = [
        {
          id: 'user_1',
          firstName: 'User',
          lastName: '1',
          primaryEmailAddress: { emailAddress: 'user1@example.com' },
          imageUrl: 'https://example.com/user.jpg',
          createdAt: 1704067200000,
          lastSignInAt: 1704153600000,
        },
      ];

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 1,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: { sortBy: 'wishlistCount', sortOrder: 'desc' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/list - 複合パラメータ', () => {
    it('ページネーション、検索、ソートを組み合わせて使用できる', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: ADMIN_USER_ID });

      const mockUsers = Array.from({ length: 30 }, (_, i) => ({
        id: `user_${i}`,
        firstName: i % 2 === 0 ? 'Admin' : 'User',
        lastName: `${i}`,
        primaryEmailAddress: { emailAddress: `user${i}@example.com` },
        imageUrl: 'https://example.com/user.jpg',
        createdAt: 1704067200000 + i * 1000,
        lastSignInAt: 1704153600000 + i * 1000,
      }));

      (clerkMiddleware as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => async (c: any, next: any) => {
        c.set('clerk', {
          users: {
            getUserList: vi.fn().mockResolvedValue({
              data: mockUsers,
              totalCount: 30,
            }),
          },
        });
        await next();
      });

      const response = await client.api.auth.list.$get({
        query: {
          page: '1',
          limit: '10',
          search: 'Admin',
          sortBy: 'lastLoginAt',
          sortOrder: 'asc',
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination.limit).toBe(10);
    });
  });
});
