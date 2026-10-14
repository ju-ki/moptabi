import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'bun:test';
import { testClient } from 'hono/testing';
import { eq } from 'drizzle-orm';
import { createDevDb } from '@db';
import { DEFAULT_USER_LIMITS } from '@shared/user/types';

import app from '..';
import {
  connectDb as connectPrisma,
  disconnectDb as disconnectPrisma,
  clearUserTestData as clearTestDataForUser,
  createTestUser,
  upsertUser,
  createUserWithDetails,
  deleteUsersExcept,
  userLimit,
} from './db-helper';

// 認証用のモックユーザーID
const ADMIN_USER_ID = 'admin_user_id';
const NORMAL_USER_ID = 'normal_user_id';

// 現在の認証ユーザーIDを保持する変数
let currentUserId: string | null = ADMIN_USER_ID;

// 認証ヘッダーを生成するヘルパー関数
function getAuthHeaders(): Record<string, string> {
  if (!currentUserId) {
    return {};
  }
  return { 'X-User-Id': currentUserId };
}

// テスト用ユーザーを作成するヘルパー関数
async function createTestUsersWithDetails(count: number, prefix: string = 'user') {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await upsertUser({
      id: `${prefix}_${i}`,
      name: `User ${i}`,
      email: `${prefix}${i}@example.com`,
      image: `https://example.com/${prefix}${i}.jpg`,
      lastLoginAt: new Date(Date.now() - i * 86400000), // i日前
      role: 'USER',
    });
    users.push(user);
  }
  return users;
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
  // テストユーザー以外を削除
  await deleteUsersExcept([ADMIN_USER_ID, NORMAL_USER_ID]);
});

describe('🧾 ユーザーリストAPIサービス', () => {
  const client = testClient(app) as any;

  describe('GET /api/auth/list', () => {
    it('管理者以外はアクセス拒否される（403）', async () => {
      currentUserId = NORMAL_USER_ID;

      const response = await client.api.auth.list.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(403);
    });

    it('未認証の場合は401を返す', async () => {
      currentUserId = null;

      const response = await client.api.auth.list.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(401);
    });

    it('管理者はアクセスできる（200）', async () => {
      currentUserId = ADMIN_USER_ID;

      const response = await client.api.auth.list.$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/list - ページネーション', () => {
    it('デフォルトのページネーション設定でレスポンスを返す', async () => {
      currentUserId = ADMIN_USER_ID;

      // 25人のテストユーザーを作成
      await createTestUsersWithDetails(25, 'user_pag');

      const response = await client.api.auth.list.$get({}, { headers: getAuthHeaders() });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination.currentPage).toBe(1);
      expect(data.pagination.limit).toBe(20);
      expect(typeof data.pagination.totalCount).toBe('number');
      expect(typeof data.pagination.totalPages).toBe('number');
      expect(typeof data.pagination.hasNextPage).toBe('boolean');
      expect(typeof data.pagination.hasPrevPage).toBe('boolean');
      expect(Array.isArray(data.users)).toBe(true);
    });

    it('ページ番号を指定してページネーションできる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestUsersWithDetails(25, 'user_page');

      const response = await client.api.auth.list.$get(
        {
          query: { page: '2' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.currentPage).toBe(2);
      expect(typeof data.pagination.hasNextPage).toBe('boolean');
      expect(typeof data.pagination.hasPrevPage).toBe('boolean');
    });

    it('1ページあたりの件数を指定できる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createTestUsersWithDetails(15, 'user_limit');

      const response = await client.api.auth.list.$get(
        {
          query: { limit: '10' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(10);
      expect(typeof data.pagination.totalPages).toBe('number');
    });
  });

  describe('GET /api/auth/list - 検索', () => {
    it('名前で検索できる', async () => {
      currentUserId = ADMIN_USER_ID;

      // 検索対象のユーザーを作成
      await createUserWithDetails({
        id: 'search_taro',
        name: '太郎 山田',
        email: 'taro@example.com',
        role: 'USER',
      });
      await createUserWithDetails({
        id: 'search_hanako',
        name: '花子 佐藤',
        email: 'hanako@example.com',
        role: 'USER',
      });

      const response = await client.api.auth.list.$get(
        {
          query: { search: '山田' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users.some((u: any) => u.id === 'search_taro')).toBe(true);
    });

    it('メールアドレスで検索できる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createUserWithDetails({
        id: 'search_email',
        name: 'Email User',
        email: 'unique_email@example.com',
        role: 'USER',
      });

      const response = await client.api.auth.list.$get(
        {
          query: { search: 'unique_email' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users.some((u: any) => u.id === 'search_email')).toBe(true);
    });
  });

  describe('GET /api/auth/list - ソート', () => {
    it('最終ログイン日時の降順でソートできる（デフォルト）', async () => {
      currentUserId = ADMIN_USER_ID;

      // 異なる日時のユーザーを作成
      await createUserWithDetails({
        id: 'sort_user_1',
        name: 'User 1',
        email: 'sort1@example.com',
        lastLoginAt: new Date('2024-01-01'),
        role: 'USER',
      });
      await createUserWithDetails({
        id: 'sort_user_2',
        name: 'User 2',
        email: 'sort2@example.com',
        lastLoginAt: new Date('2024-06-01'),
        role: 'USER',
      });

      const response = await client.api.auth.list.$get(
        {
          query: { sortBy: 'lastLoginAt', sortOrder: 'desc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      // 降順でソートされていることを確認
      const sortUsers = data.users.filter((u: any) => u.id.startsWith('sort_user'));
      if (sortUsers.length >= 2) {
        expect(sortUsers[0].lastLoginAt).toBeGreaterThanOrEqual(sortUsers[1].lastLoginAt);
      }
    });

    it('最終ログイン日時の昇順でソートできる', async () => {
      currentUserId = ADMIN_USER_ID;

      await createUserWithDetails({
        id: 'sort_asc_1',
        name: 'User 1',
        email: 'sortasc1@example.com',
        lastLoginAt: new Date('2024-01-01'),
        role: 'USER',
      });
      await createUserWithDetails({
        id: 'sort_asc_2',
        name: 'User 2',
        email: 'sortasc2@example.com',
        lastLoginAt: new Date('2024-06-01'),
        role: 'USER',
      });

      const response = await client.api.auth.list.$get(
        {
          query: { sortBy: 'lastLoginAt', sortOrder: 'asc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('登録日時でソートできる', async () => {
      currentUserId = ADMIN_USER_ID;

      const response = await client.api.auth.list.$get(
        {
          query: { sortBy: 'registeredAt', sortOrder: 'desc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('プラン数でソートできる', async () => {
      currentUserId = ADMIN_USER_ID;

      const response = await client.api.auth.list.$get(
        {
          query: { sortBy: 'planCount', sortOrder: 'desc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('行きたいリスト数でソートできる', async () => {
      currentUserId = ADMIN_USER_ID;

      const response = await client.api.auth.list.$get(
        {
          query: { sortBy: 'wishlistCount', sortOrder: 'desc' },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/list - 複合パラメータ', () => {
    it('ページネーション、検索、ソートを組み合わせて使用できる', async () => {
      currentUserId = ADMIN_USER_ID;

      // Adminを含むユーザーを作成
      for (let i = 0; i < 15; i++) {
        await createUserWithDetails({
          id: `combo_admin_${i}`,
          name: `Admin ${i}`,
          email: `combo_admin${i}@example.com`,
          lastLoginAt: new Date(Date.now() - i * 86400000),
          role: 'USER',
        });
      }

      const response = await client.api.auth.list.$get(
        {
          query: {
            page: '1',
            limit: '10',
            search: 'Admin',
            sortBy: 'lastLoginAt',
            sortOrder: 'asc',
          },
        },
        { headers: getAuthHeaders() },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination.limit).toBe(10);
    });
  });
});

describe('GET /api/auth - UserLimit自動作成', () => {
  const NEW_USER_ID = 'test_auth_new_user';
  const client = testClient(app) as any;
  const db = createDevDb(process.env.DATABASE_URL!);

  beforeAll(async () => {
    await clearTestDataForUser(NEW_USER_ID);
  });

  afterAll(async () => {
    await clearTestDataForUser(NEW_USER_ID);
  });

  it('初回ログイン時にUserLimitが既定値で作成される (B-4)', async () => {
    const response = await client.api.auth.$get(
      {},
      { headers: { 'X-User-Id': NEW_USER_ID, 'X-User-Email': 'new@example.com', 'X-User-Name': 'New User' } },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe(201);

    const [row] = await db.select().from(userLimit).where(eq(userLimit.userId, NEW_USER_ID)).limit(1);
    expect(row).toBeDefined();
    expect(row.maxWishlistSpots).toBe(DEFAULT_USER_LIMITS.maxWishlistSpots);
    expect(row.maxPlans).toBe(DEFAULT_USER_LIMITS.maxPlans);
    expect(row.maxSpotsPerDay).toBe(DEFAULT_USER_LIMITS.maxSpotsPerDay);
    expect(row.maxPlanDays).toBe(DEFAULT_USER_LIMITS.maxPlanDays);
    expect(row.maxUserLocations).toBe(DEFAULT_USER_LIMITS.maxUserLocations);
  });

  it('2回目以降のログインでUserLimitが重複作成されない (B-5)', async () => {
    await client.api.auth.$get({}, { headers: { 'X-User-Id': NEW_USER_ID } });

    const rows = await db.select().from(userLimit).where(eq(userLimit.userId, NEW_USER_ID));
    expect(rows.length).toBe(1);
  });
});
