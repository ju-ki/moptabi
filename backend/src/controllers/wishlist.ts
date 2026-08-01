import { Context } from 'hono';

import { createWishList, deleteWishList, getWishList, getWishListCount, updateWishList } from '@/services/wishlist';
import { getDbFromContext } from '@/db';

export const wishListHandler = {
  getWishList: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await getWishList(db, c);
    return c.json(response, 200);
  },
  getWishListCount: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await getWishListCount(db, c);
    return c.json(response, 200);
  },
  createWishList: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await createWishList(db, c);
    return c.json(response, 201);
  },
  updateWishList: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await updateWishList(db, c);
    return c.json(response, 200);
  },
  deleteWishList: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await deleteWishList(db, c);
    return c.json(response, 200);
  },
};
