import { createRoute, z } from '@hono/zod-openapi';

import { CreateUserLocationSchema, UpdateUserLocationSchema, UserLocationListSchema } from '@/models/userLocation';

/**
 * 取得
 */
export const getUserLocationRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['UserLocation'],
  summary: 'ユーザーのお気に入り地点を取得',
  responses: {
    200: {
      description: 'ユーザーのお気に入り地点一覧を取得',
      content: {
        'application/json': {
          schema: UserLocationListSchema,
        },
      },
    },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 追加
 */
export const createUserLocationRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['UserLocation'],
  summary: 'ユーザーのお気に入り地点を追加',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserLocationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'リストに追加成功',
      content: {
        'application/json': {
          schema: UserLocationListSchema,
        },
      },
    },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 更新
 */
export const updateUserLocationRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['UserLocation'],
  summary: 'ユーザーのお気に入り地点の内容を更新',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '10' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateUserLocationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '更新成功',
      content: {
        'application/json': {
          schema: UserLocationListSchema,
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
export const deleteUserLocationRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['UserLocation'],
  summary: 'ユーザーのお気に入り地点から削除',
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
