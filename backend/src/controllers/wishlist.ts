import { Context } from 'hono';

import { createWishList, deleteWishList, getWishList, updateWishList } from '@/services/wishlist';

export const wishListHandler = {
  getWishList: async (c: Context) => {
    const response = await getWishList(c);
    return c.json(response, 200);
  },
  createWishList: async (c: Context) => {
    const response = await createWishList(c);
    return c.json(response, 201);
  },
  updateWishList: async (c: Context) => {
    const response = await updateWishList(c);
    return c.json(response, 200);
  },
  deleteWishList: async (c: Context) => {
    const response = await deleteWishList(c);
    return c.json(response, 200);
  },
};
