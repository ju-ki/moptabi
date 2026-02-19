import { createRoute, z } from '@hono/zod-openapi';

import {
  WishlistCreateSchema,
  WishlistListResponseSchema,
  WishlistSchema,
  WishlistUpdateSchema,
} from '@/models/wishlist';

/**
 * 取得
 */
export const getWishlistRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Wishlist'],
  summary: '行きたいリストを取得',
  responses: {
    200: {
      description: 'ユーザーの行きたいリスト一覧を取得',
      content: {
        'application/json': {
          schema: WishlistListResponseSchema,
        },
      },
    },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 追加
 */
export const createWishlistRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Wishlist'],
  summary: '行きたいリストにスポットを追加',
  request: {
    body: {
      content: {
        'application/json': {
          schema: WishlistCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'リストに追加成功',
      content: {
        'application/json': {
          schema: WishlistSchema,
        },
      },
    },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 更新
 */
export const updateWishlistRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Wishlist'],
  summary: '行きたいリストの内容を更新',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '10' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: WishlistUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '更新成功',
      content: {
        'application/json': {
          schema: WishlistSchema,
        },
      },
    },
    404: { description: '指定されたIDが存在しない' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 削除
 */
export const deleteWishlistRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Wishlist'],
  summary: '行きたいリストから削除',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '10' }),
    }),
  },
  responses: {
    204: { description: '削除成功' },
    404: { description: '指定されたIDが存在しない' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * カウント取得
 */
export const getWishlistCountRoute = createRoute({
  method: 'get',
  path: '/count',
  tags: ['Wishlist'],
  summary: '行きたいリストの登録数と上限を取得',
  responses: {
    200: {
      description: '登録数と上限を返却',
      content: {
        'application/json': {
          schema: z.object({
            count: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
    500: { description: 'サーバーエラー' },
  },
});
