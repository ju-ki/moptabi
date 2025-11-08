import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';

import { PrismaClient } from '@/generated/prisma';
import { WishlistCreateSchema, WishlistUpdateSchema } from '@/models/wishlist';

const prisma = new PrismaClient();

export const getWishList = async (c: Context) => {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized error' }, 401);
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
  }
};

export const createWishList = async (c: Context) => {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized error' }, 401);
    }

    const userId = auth.userId;

    const body = await c.req.json();
    if (!body) {
      return c.json({ error: 'Request body is required' }, 400);
    }
    const result = WishlistCreateSchema.safeParse(body);
    if (!result.success) {
      const formattedErrors = result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        received: err.code === 'invalid_type' ? err.received : undefined,
        expected: err.code === 'invalid_type' ? err.expected : undefined,
      }));

      console.error('Validation failed:', formattedErrors);
      return c.json({ error: 'Invalid request body', details: formattedErrors }, 400);
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
      return c.json({ error: 'Wishlist entry already exists for this spot' }, 400);
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
  }
};

export const updateWishList = async (c: Context) => {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized error' }, 401);
    }

    const body = await c.req.json();
    if (!body) {
      return c.json({ error: 'Request body is required' }, 400);
    }

    const result = WishlistUpdateSchema.safeParse(body);
    if (!result.success) {
      const formattedErrors = result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        received: err.code === 'invalid_type' ? err.received : undefined,
        expected: err.code === 'invalid_type' ? err.expected : undefined,
      }));

      console.error('Validation failed:', formattedErrors);
      return c.json({ error: 'Invalid request body', details: formattedErrors }, 400);
    }
    const wishListResult = result.data;

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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
  }
};
export const deleteWishList = async (c: Context) => {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized error' }, 401);
    }

    const wishlistId = parseInt(c.req.param('id'));

    if (isNaN(wishlistId)) {
      return c.json({ error: 'Invalid wishlist ID' }, 400);
    }

    if (isNaN(wishlistId)) {
      return c.json({ error: 'Invalid wishlist ID' }, 400);
    }

    const wishlist = await prisma.wishlist.delete({
      where: {
        id: wishlistId,
      },
    });

    return wishlist;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
  }
};
