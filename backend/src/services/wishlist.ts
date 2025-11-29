import { getAuth } from '@hono/clerk-auth';
import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';

import { PrismaClient } from '@/generated/prisma';
import { WishlistCreateSchema, WishlistUpdateSchema } from '@/models/wishlist';

const prisma = new PrismaClient();

export const getWishList = async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized error' });
  }

  const userId = auth.userId;

  const wishList = await prisma.wishlist.findMany({
    where: { userId: userId },
    include: {
      spot: {
        include: {
          meta: true,
        },
      },
    },
    orderBy: {
      priority: 'desc',
    },
  });

  return wishList;
};

export const createWishList = async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized error' });
  }

  const userId = auth.userId;

  const body = await c.req.json();
  if (!body) {
    throw new HTTPException(400, { message: 'Request body is required' });
  }
  const result = WishlistCreateSchema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }
  const wishListResult = result.data;

  // spotが登録されているかを確認する
  const existingSpot = await prisma.spot.findUnique({
    where: {
      id: wishListResult.spotId,
    },
  });

  // spotが登録されていない場合はまずスポットを登録する
  if (!existingSpot) {
    await prisma.spot.create({
      data: {
        id: wishListResult.spotId,
        meta: {
          create: {
            id: wishListResult.spotId,
            name: wishListResult.spot.meta.name,
            description: wishListResult.spot.meta.description,
            latitude: wishListResult.spot.meta.latitude,
            longitude: wishListResult.spot.meta.longitude,
            categories: wishListResult.spot.meta.categories,
            image: wishListResult.spot.meta.image,
            rating: wishListResult.spot.meta.rating,
            catchphrase: wishListResult.spot.meta.catchphrase,
            openingHours: wishListResult.spot.meta.openingHours
              ? (wishListResult.spot.meta.openingHours as any)
              : undefined,
          },
        },
      },
    });
  }

  // 既存の行きたいリストの重複チェック
  const existingWishlist = await prisma.wishlist.findFirst({
    where: {
      userId: userId,
      spotId: wishListResult.spotId,
    },
  });

  if (existingWishlist) {
    throw new HTTPException(400, { message: 'Wishlist entry already exists for this spot' });
  }

  const wishList = await prisma.wishlist.create({
    data: {
      spotId: wishListResult.spotId,
      userId: userId,
      priority: wishListResult.priority,
      memo: wishListResult.memo,
      visited: wishListResult.visited,
      visitedAt: wishListResult.visitedAt,
    },
  });

  return wishList;
};

export const updateWishList = async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized error' });
  }

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
  const existingWishlist = await prisma.wishlist.findUnique({
    where: {
      id: wishListResult.id,
    },
  });

  if (!existingWishlist) {
    throw new HTTPException(404, { message: 'Wishlist entry not found' });
  }

  const wishlist = await prisma.wishlist.update({
    where: {
      id: wishListResult.id,
      userId: auth.userId,
    },
    data: {
      memo: wishListResult.memo,
      priority: wishListResult.priority,
      visited: wishListResult.visited,
      visitedAt: wishListResult.visitedAt,
    },
  });

  return wishlist;
};
export const deleteWishList = async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized error' });
  }

  const wishlistId = parseInt(c.req.param('id'));

  if (isNaN(wishlistId)) {
    throw new HTTPException(400, { message: 'Invalid wishlist ID' });
  }

  const wishlist = await prisma.wishlist.delete({
    where: {
      id: wishlistId,
    },
  });

  return wishlist;
};
