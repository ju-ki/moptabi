import { Context } from 'hono';

import { createWishList, deleteWishList, getWishList, updateWishList } from '@/services/wishlist';

export const wishListHandler = {
  getWishList: async (c: Context) => {
    try {
      const response = await getWishList(c);
      return c.json(response, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },
  createWishList: async (c: Context) => {
    try {
      const response = await createWishList(c);
      return c.json(response, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },
  updateWishList: async (c: Context) => {
    try {
      const response = await updateWishList(c);
      return c.json(response, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },
  deleteWishList: async (c: Context) => {
    try {
      const response = await deleteWishList(c);
      return c.json(response, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },
};
