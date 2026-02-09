import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '@/lib/client';
import { getUserId } from '@/middleware/auth';

import { getTotalWishlistAndIncreaseAndDecrease } from './wishlist';
import { getTripStatistics } from './trip';

export const getDashboardStats = async (c: Context) => {
  // ダッシュボード用の統計情報を取得するロジックをここに実装

  const userId = getUserId(c);

  // 管理者権限以外は401を返す
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (targetUser?.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden: Admin access required' });
  }

  // TODO: ClerkからNextAuth.jsへの移行後、ユーザーリスト取得を実装
  // 現在はDBのユーザー情報を使用
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const userList = users.map((user) => ({
    id: user.id,
    firstName: user.name?.split(' ')[0] || '',
    lastName: user.name?.split(' ')[1] || '',
    email: user.email,
    imageUrl: user.image,
    registeredAt: user.createdAt.getTime(),
    lastLoginAt: user.lastLoginAt?.getTime() || null,
  }));

  const totalUsers = users.length;
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const activeUserCountFromLastMonth = users.filter((user) => {
    if (!user.lastLoginAt) return false;
    return user.lastLoginAt >= oneMonthAgo;
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
