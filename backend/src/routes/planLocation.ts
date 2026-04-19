import { createRoute, z } from '@hono/zod-openapi';

import {
  PlanLocationListSchema,
  PlanLocationSchema,
  CreatePlanLocationSchema,
  PlanLocationCandidateQuerySchema,
  PlanLocationCandidateResponseSchema,
  PlanLocationIdParamSchema,
} from '@/models/planLocation';

/**
 * 一覧取得
 */
export const getPlanLocationListRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['PlanLocation'],
  summary: 'プラン作成時の出発地・目的地履歴を取得',
  request: {
    query: z.object({
      locationType: z.enum(['DEPARTURE', 'DESTINATION']).optional(),
    }),
  },
  responses: {
    200: {
      description: '履歴一覧を取得',
      content: {
        'application/json': {
          schema: PlanLocationListSchema,
        },
      },
    },
    401: { description: '認証エラー' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 候補取得（UserLocation + PlanLocationの両方を返す）
 */
export const getPlanLocationCandidatesRoute = createRoute({
  method: 'get',
  path: '/candidates',
  tags: ['PlanLocation'],
  summary: '出発地・目的地の候補を取得（お気に入り + 履歴）',
  request: {
    query: PlanLocationCandidateQuerySchema,
  },
  responses: {
    200: {
      description: '候補一覧を取得',
      content: {
        'application/json': {
          schema: PlanLocationCandidateResponseSchema,
        },
      },
    },
    401: { description: '認証エラー' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 作成（または使用回数更新）
 */
export const createPlanLocationRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['PlanLocation'],
  summary: '出発地・目的地履歴を登録（または使用回数を更新）',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreatePlanLocationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: '登録成功',
      content: {
        'application/json': {
          schema: PlanLocationSchema,
        },
      },
    },
    400: { description: 'リクエストが不正' },
    401: { description: '認証エラー' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 削除
 */
export const deletePlanLocationRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['PlanLocation'],
  summary: '出発地・目的地履歴を削除',
  request: {
    params: PlanLocationIdParamSchema,
  },
  responses: {
    200: {
      description: '削除成功',
      content: {
        'application/json': {
          schema: PlanLocationSchema,
        },
      },
    },
    401: { description: '認証エラー' },
    404: { description: '指定されたIDが存在しない' },
    500: { description: 'サーバーエラー' },
  },
});
