import { createRoute, z } from '@hono/zod-openapi';

import { TripSchema } from '../models/trip';

export const requestParams = z
  .object({
    id: z.string().min(1).regex(/^\d+$/).transform(Number),
  })
  .openapi('RequestParams');

export const requestFileParams = z
  .object({
    fileName: z.string(),
  })
  .openapi('RequestParams');

export const getTripsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Trip'],
  summary: '全ての旅行計画を取得',
  responses: {
    200: {
      description: '旅行計画一覧を返却',
      content: {
        'application/json': {
          schema: TripSchema.array(),
        },
      },
    },
    500: {
      description: '旅行計画取得時のエラー',
    },
  },
});

export const uploadImageRoute = createRoute({
  method: 'post',
  path: '/upload',
  tags: ['Image'],
  summary: '画像をアップロード',
  request: {},
  responses: {
    201: {
      description: 'アップロードされた画像のURL',
      content: {
        'application/json': {
          schema: z.object({
            url: z.string(),
          }),
        },
      },
    },
    500: {
      description: '画像アップロード時のエラー',
    },
  },
});

export const getImageRoute = createRoute({
  method: 'get',
  path: '/{fileName}',
  tags: ['Image'],
  summary: '画像を取得',
  request: {
    params: requestFileParams,
  },
  responses: {
    200: {
      description: '画像取得成功',
    },
    500: {
      description: '画像取得時のエラー',
    },
  },
});

export const getTripDetailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Trip'],
  summary: '特定の旅行計画詳細を取得',
  request: {
    params: requestParams,
  },
  responses: {
    200: {
      description: '特定の旅行計画詳細',
      content: {
        'application/json': {
          schema: TripSchema,
        },
      },
    },
    404: {
      description: '旅行計画が取得できない',
    },
    500: {
      description: '旅行計画取得時のエラー',
    },
  },
});

export const deleteTripRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Trip'],
  summary: '旅行計画を削除',
  request: {
    params: requestParams,
  },
  responses: {
    200: {
      description: '旅行計画削除成功',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: '旅行計画が取得できない',
    },
    500: {
      description: '旅行計画削除時のエラー',
    },
  },
});

export const createTripRoute = createRoute({
  method: 'post',
  path: '/create',
  tags: ['Trip'],
  summary: '新しい旅行計画を作成',
  request: {
    body: {
      content: {
        'application/json': {
          schema: TripSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: '作成された旅行計画',
      content: {
        'application/json': {
          schema: TripSchema,
        },
      },
    },
    500: {
      description: '旅行計画取得時のエラー',
    },
  },
});

export const getTripCountRoute = createRoute({
  method: 'get',
  path: '/count',
  tags: ['Trip'],
  summary: 'プランの作成数と上限を取得',
  responses: {
    200: {
      description: 'プラン数と上限を返却',
      content: {
        'application/json': {
          schema: z.object({
            count: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
    500: {
      description: 'プラン数取得時のエラー',
    },
  },
});

export const getDepartureAndDepartment = createRoute({
  method: 'get',
  path: '/',
  tags: ['DepartureAndDestination'],
  summary: 'ユーザーの出発地と目的地の履歴を取得',
  responses: {
    200: {
      description: '出発地と目的地の履歴を返却',
      content: {
        'application/json': {
          schema: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              lat: z.number(),
              lng: z.number(),
            }),
          ),
        },
      },
    },
    500: {
      description: '出発地と目的地の履歴取得時のエラー',
    },
  },
});
