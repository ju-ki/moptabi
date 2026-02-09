import { RouteHandler } from '@hono/zod-openapi';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { countWishListByUserId } from '@/services/wishlist';
import { countPlanByUserId } from '@/services/trip';
import { getDashboardStats } from '@/services/auth';
import { calculatePagination } from '@/models/pagination';
import { UserSortBy } from '@/models/user';
import { prisma } from '@/lib/client';
import { getUserId } from '@/middleware/auth';

import { findExistingUserRoute } from '../routes/auth';

export const getAuthHandler: RouteHandler<typeof findExistingUserRoute> = async (c: Context) => {
  try {
    const userId = getUserId(c);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      // ヘッダーからユーザー情報を取得
      const email = c.req.header('X-User-Email');
      const encodedName = c.req.header('X-User-Name');
      const image = c.req.header('X-User-Image');

      // 名前はエンコードされているのでデコード
      const name = encodedName ? decodeURIComponent(encodedName) : null;

      const createdUser = await prisma.user.create({
        data: {
          id: userId,
          email: email || null,
          name: name,
          image: image || null,
          lastLoginAt: new Date(),
          createdAt: new Date(),
        },
      });

      return c.json({ status: 201, user: createdUser });
    }

    // 既存ユーザーの lastLoginAt を更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    return c.json({ status: 200, user: updatedUser });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
  }
};

export async function getUserList(c: Context) {
  const userId = getUserId(c);
  if (!userId) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

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
  const search = query.search?.toLowerCase();
  const sortBy: UserSortBy = (query.sortBy as UserSortBy) || 'lastLoginAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const registeredUsers = await prisma.user.findMany();
  const userIds = registeredUsers.map((user: { id: string }) => user.id);

  // clerkから取得したユーザーIDを元に行きたいリストと旅行計画の総数を取得する
  const [wishlistCounts, planCounts] = await Promise.all([countWishListByUserId(userIds), countPlanByUserId(userIds)]);

  let userList = registeredUsers.map((user) => ({
    id: user.id,
    firstName: user.name?.split(' ')[0] || '',
    lastName: user.name?.split(' ')[1] || '',
    email: user.email,
    imageUrl: user.image,
    registeredAt: user.createdAt.getTime(),
    lastLoginAt: user.lastLoginAt?.getTime() || null,
    role: user.role,
    planCount: planCounts[user.id] || 0,
    wishlistCount: wishlistCounts[user.id] || 0,
  }));

  // 検索フィルター
  if (search) {
    userList = userList.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const id = user.id.toLowerCase();
      return fullName.includes(search) || email.includes(search) || id.includes(search);
    });
  }

  // ソート
  userList.sort((a, b) => {
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
        aValue = a.planCount || 0;
        bValue = b.planCount || 0;
        break;
      case 'wishlistCount':
        aValue = a.wishlistCount || 0;
        bValue = b.wishlistCount || 0;
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
