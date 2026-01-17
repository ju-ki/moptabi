import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '@/lib/client';

import { getTotalWishlistAndIncreaseAndDecrease } from './wishlist';
import { getTripStatistics } from './trip';

export const getDashboardStats = async (c: Context) => {
  // ダッシュボード用の統計情報を取得するロジックをここに実装

  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  // 管理者権限以外は401を返す
  const targetUser = await prisma.user.findUnique({
    where: { id: auth.userId },
  });

  if (targetUser?.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden: Admin access required' });
  }

  const clerkClient = c.get('clerk');
  const users = await clerkClient.users.getUserList();
  // アクセス時点1ヶ月間で最終ログインしているユーザー数を取得する
  const userList = users.data.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.primaryEmailAddress,
    imageUrl: user.imageUrl,
    registeredAt: user.createdAt,
    lastLoginAt: user.lastSignInAt,
  }));
  const totalUsers = users.totalCount;
  const activeUserCountFromLastMonth = userList.filter((user) => {
    if (!user.lastLoginAt) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return user.lastLoginAt >= Math.floor(oneMonthAgo.getTime());
  }).length;
  const wishlistStats = await getTotalWishlistAndIncreaseAndDecrease();
  const tripStats = await getTripStatistics();

  return {
    totalUsers,
    activeUserCountFromLastMonth,
    wishlistStats,
    tripStats,
  };
};
