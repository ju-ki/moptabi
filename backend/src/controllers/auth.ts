import { RouteHandler } from '@hono/zod-openapi';
import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { countWishListByUserId } from '@/services/wishlist';
import { countPlanByUserId } from '@/services/trip';
import { getDashboardStats } from '@/services/auth';
import { calculatePagination } from '@/models/pagination';
import { User, UserSortBy } from '@/models/user';

import { PrismaClient } from '../generated/prisma';
import { findExistingUserRoute } from '../routes/auth';

const prisma = new PrismaClient();

export const getAuthHandler: RouteHandler<typeof findExistingUserRoute> = async (c: Context) => {
  try {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: auth.userId,
      },
    });

    if (!existingUser) {
      const createdUser = await prisma.user.create({
        data: {
          id: auth.userId,
        },
      });

      return c.json({ status: 201, user: createdUser });
    }
    return c.json({ status: 200, user: existingUser });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
  }
};

export async function getUserList(c: Context) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  // 管理者権限以外は403を返す
  const targetUser = await prisma.user.findUnique({
    where: { id: auth.userId },
  });

  if (targetUser?.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  // クエリパラメータを取得
  const query = c.req.query() as Record<string, string | undefined>;
  const page = parseInt(query.page || '1', 10);
  const limit = Math.min(parseInt(query.limit || '20', 10), 100);
  const search = query.search?.toLowerCase();
  const sortBy: UserSortBy = (query.sortBy as UserSortBy) || 'lastLoginAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const clerkClient = c.get('clerk');
  const registeredUsers = await prisma.user.findMany();
  const users = await clerkClient.users.getUserList({
    userId: registeredUsers.map((user: { id: string }) => user.id),
    limit: 100,
  });
  const userIds = users.data.map((user: { id: string }) => user.id);

  // clerkから取得したユーザーIDを元に行きたいリストと旅行計画の総数を取得する
  const [wishlistCounts, planCounts] = await Promise.all([countWishListByUserId(userIds), countPlanByUserId(userIds)]);

  // ユーザー情報にカウントを追加してリストを作成
  let userList: User[] = users.data.map((user: { id: string; firstName: string | null; lastName: string | null; primaryEmailAddress: { emailAddress: string } | null; imageUrl: string | null; createdAt: number; lastSignInAt: number | null }) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.primaryEmailAddress ? { emailAddress: user.primaryEmailAddress.emailAddress } : null,
    imageUrl: user.imageUrl,
    registeredAt: user.createdAt,
    lastLoginAt: user.lastSignInAt,
    role: registeredUsers.find((u: { id: string }) => u.id === user.id)?.role || 'GUEST',
    wishlistCount: wishlistCounts[user.id] || 0,
    planCount: planCounts[user.id] || 0,
  }));

  // 検索フィルター
  if (search) {
    userList = userList.filter((user: User) => {
      const fullName = `${user.firstName || ''}${user.lastName || ''}`.toLowerCase();
      const email = user.email?.emailAddress?.toLowerCase() || '';
      const id = user.id.toLowerCase();
      return fullName.includes(search) || email.includes(search) || id.includes(search);
    });
  }

  // ソート
  userList.sort((a: User, b: User) => {
    let aValue: number;
    let bValue: number;

    switch (sortBy) {
      case 'lastLoginAt':
        aValue = a.lastLoginAt || 0;
        bValue = b.lastLoginAt || 0;
        break;
      case 'registeredAt':
        aValue = a.registeredAt || 0;
        bValue = b.registeredAt || 0;
        break;
      case 'planCount':
        aValue = a.planCount;
        bValue = b.planCount;
        break;
      case 'wishlistCount':
        aValue = a.wishlistCount;
        bValue = b.wishlistCount;
        break;
      default:
        aValue = a.lastLoginAt || 0;
        bValue = b.lastLoginAt || 0;
    }

    if (sortOrder === 'asc') {
      return aValue - bValue;
    }
    return bValue - aValue;
  });

  // ページネーション
  const totalCount = userList.length;
  const startIndex = (page - 1) * limit;
  const paginatedUsers = userList.slice(startIndex, startIndex + limit);
  const pagination = calculatePagination(totalCount, page, limit);

  return c.json(
    {
      users: paginatedUsers,
      pagination,
    },
    200,
  );
}

export async function getStats(c: Context) {
  const stats = await getDashboardStats(c);
  return c.json(stats, 200);
}
