import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';
import { eq, and, count, lt, inArray } from 'drizzle-orm';
import { db, wishlist } from '@db';

import { WishlistCreateSchema, WishlistUpdateSchema } from '@/models/wishlist';
import { APP_LIMITS, LIMIT_ERROR_MESSAGES } from '@/constants/limits';
import { getUserId } from '@/middleware/auth';

export const getWishList = async (c: Context) => {
  const userId = getUserId(c);

  const rows = await db.query.wishlist.findMany({
    where: eq(wishlist.userId, userId),
    orderBy: (wishlist, { desc }) => [desc(wishlist.priority)],
  });

  // placeIdのみ返す（SpotMetaは返さない。詳細情報はフロントエンドでGoogle Maps APIから取得）
  return rows.map((row) => ({
    ...row,
    spot: {
      id: row.spotId,
    },
  }));
};

/**
 * 行きたいリストの登録数と上限を取得
 */
export const getWishListCount = async (c: Context) => {
  const userId = getUserId(c);

  const [result] = await db.select({ count: count() }).from(wishlist).where(eq(wishlist.userId, userId));

  return {
    count: result?.count ?? 0,
    limit: APP_LIMITS.MAX_WISHLIST_SPOTS,
  };
};

export const createWishList = async (c: Context) => {
  const userId = getUserId(c);

  // 上限チェック
  const [countResult] = await db.select({ count: count() }).from(wishlist).where(eq(wishlist.userId, userId));

  if ((countResult?.count ?? 0) >= APP_LIMITS.MAX_WISHLIST_SPOTS) {
    throw new HTTPException(400, { message: LIMIT_ERROR_MESSAGES.WISHLIST_LIMIT_EXCEEDED });
  }

  const body = await c.req.json();
  if (!body) {
    throw new HTTPException(400, { message: 'Request body is required' });
  }
  const result = WishlistCreateSchema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }
  const wishListResult = result.data;

  // 既存の行きたいリストの重複チェック
  const [existingWishlist] = await db
    .select()
    .from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.spotId, wishListResult.spotId)))
    .limit(1);

  if (existingWishlist) {
    throw new HTTPException(400, { message: 'Wishlist entry already exists for this spot' });
  }

  const [newWishlist] = await db
    .insert(wishlist)
    .values({
      spotId: wishListResult.spotId,
      userId: userId,
      priority: wishListResult.priority,
      memo: wishListResult.memo,
      visited: wishListResult.visited,
      visitedAt: wishListResult.visitedAt ? wishListResult.visitedAt.toISOString() : null,
    })
    .returning();

  return newWishlist;
};

export const updateWishList = async (c: Context) => {
  const userId = getUserId(c);

  const body = await c.req.json();
  if (!body) {
    throw new HTTPException(400, { message: 'Request body is required' });
  }

  const result = WishlistUpdateSchema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }
  const wishListResult = result.data;

  // 更新対象の行きたいリストが存在するか確認する
  const [existingWishlist] = await db.select().from(wishlist).where(eq(wishlist.id, wishListResult.id)).limit(1);

  if (!existingWishlist) {
    throw new HTTPException(404, { message: 'Wishlist entry not found' });
  }

  const [updated] = await db
    .update(wishlist)
    .set({
      memo: wishListResult.memo,
      priority: wishListResult.priority,
      visited: wishListResult.visited,
      visitedAt: wishListResult.visitedAt ? wishListResult.visitedAt.toISOString() : null,
    })
    .where(and(eq(wishlist.id, wishListResult.id), eq(wishlist.userId, userId)))
    .returning();

  return updated;
};

export const deleteWishList = async (c: Context) => {
  const userId = getUserId(c);

  const wishlistId = parseInt(c.req.param('id'));

  if (isNaN(wishlistId)) {
    throw new HTTPException(400, { message: 'Invalid wishlist ID' });
  }

  // ユーザーが所有している行きたいリストのみ削除可能
  const [deleted] = await db
    .delete(wishlist)
    .where(and(eq(wishlist.id, wishlistId), eq(wishlist.userId, userId)))
    .returning();

  return deleted;
};

/**
 * ユーザーIDごとの行きたいリストの数を取得
 * @param userIds clerkに登録されているuserIdの配列
 * @returns ユーザーIDをキー、行きたいリストの数を値とするオブジェクト
 */
export const countWishListByUserId = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return {};
  }

  const counts = await db
    .select({
      userId: wishlist.userId,
      count: count(),
    })
    .from(wishlist)
    .where(inArray(wishlist.userId, userIds))
    .groupBy(wishlist.userId);

  const countMap: Record<string, number> = {};
  counts.forEach((item) => {
    countMap[item.userId] = item.count;
  });

  return countMap;
};

/**
 * 総行きたいリストと前月からの増減数を取得
 * @returns 行きたいリストの統計情報
 */
export const getTotalWishlistAndIncreaseAndDecrease = async () => {
  const [totalResult] = await db.select({ count: count() }).from(wishlist);
  const totalWishlist = totalResult?.count ?? 0;

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [lastMonthResult] = await db
    .select({ count: count() })
    .from(wishlist)
    .where(lt(wishlist.createdAt, startOfThisMonth.toISOString()));
  const lastMonthWishlist = lastMonthResult?.count ?? 0;

  return {
    totalWishlist,
    wishlistIncreaseFromLastMonth: totalWishlist - lastMonthWishlist,
  };
};
