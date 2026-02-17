import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, desc } from 'drizzle-orm';
import { db, user } from '@db';

import { getUserId } from '@/middleware/auth';

import { getTotalWishlistAndIncreaseAndDecrease } from './wishlist';
import { getTripStatistics } from './trip';

export const getDashboardStats = async (c: Context) => {
  // ダッシュボード用の統計情報を取得するロジックをここに実装

  const userId = getUserId(c);

  // 管理者権限以外は401を返す
  const [targetUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

  if (targetUser?.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden: Admin access required' });
  }

  // TODO: ClerkからNextAuth.jsへの移行後、ユーザーリスト取得を実装
  // 現在はDBのユーザー情報を使用
  const users = await db.select().from(user).orderBy(desc(user.createdAt));

  const userList = users.map((u) => ({
    id: u.id,
    firstName: u.name?.split(' ')[0] || '',
    lastName: u.name?.split(' ')[1] || '',
    email: u.email,
    imageUrl: u.image,
    registeredAt: u.createdAt ? new Date(u.createdAt).getTime() : Date.now(),
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : null,
  }));

  const totalUsers = users.length;
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const activeUserCountFromLastMonth = users.filter((u) => {
    if (!u.lastLoginAt) return false;
    return new Date(u.lastLoginAt) >= oneMonthAgo;
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
