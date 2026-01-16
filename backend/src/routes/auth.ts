import { createRoute } from '@hono/zod-openapi';

import { StatsSchema } from '@/models/auth';
import { UserListQuerySchema, UserListResponseSchema } from '@/models/user';

export const findExistingUserRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Auth'],
  summary: 'ユーザーの存在チェック',
  responses: {
    200: {
      description: 'ユーザーが存在する',
    },
    201: {
      description: '新規ユーザー登録完了',
    },
    401: {
      description: 'ユーザー登録失敗',
    },
    500: {
      description: 'サーバーでエラー発生',
    },
  },
});

export const getUserListRoute = createRoute({
  method: 'get',
  path: '/list',
  tags: ['Auth'],
  summary: 'ユーザーの一覧取得（ページネーション・検索・ソート対応）',
  request: {
    query: UserListQuerySchema,
  },
  responses: {
    200: {
      description: 'ユーザーの一覧取得',
      content: {
        'application/json': {
          schema: UserListResponseSchema,
        },
      },
    },
    401: {
      description: '認証エラー',
    },
    403: {
      description: '権限エラー',
    },
    500: {
      description: 'サーバーでエラー発生',
    },
  },
});

export const getDashboardStatsRoute = createRoute({
  method: 'get',
  path: '/dashboard',
  tags: ['Auth'],
  summary: 'ダッシュボード用の統計情報を取得',
  responses: {
    200: {
      description: 'ダッシュボード用の統計情報を取得成功',
      content: {
        'application/json': {
          schema: StatsSchema,
        },
      },
    },
    401: {
      description: '認証エラー',
    },
    500: {
      description: 'サーバーでエラー発生',
    },
  },
});
