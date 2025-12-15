import { createRoute } from '@hono/zod-openapi';

import {
  UnvisitedSpotsResponseSchema,
  VisitedSpotsResponseSchema,
  UnvisitedSpotsQuerySchema,
  VisitedSpotsQuerySchema,
} from '@/models/spot';

/**
 * 未訪問の行きたいリストに登録しているスポットを取得
 */
export const getUnvisitedSpotsRoute = createRoute({
  method: 'get',
  path: '/unvisited',
  tags: ['Spots'],
  summary: '未訪問の行きたいリストのスポットを取得',
  description:
    'ユーザーが行きたいリストに登録している未訪問のスポットを取得します。都道府県・優先度でフィルタリング、優先度・追加日でソートできます。',
  request: {
    query: UnvisitedSpotsQuerySchema,
  },
  responses: {
    200: {
      description: '未訪問スポット一覧の取得成功',
      content: {
        'application/json': {
          schema: UnvisitedSpotsResponseSchema,
        },
      },
    },
    401: { description: '認証エラー - ログインが必要です' },
    500: { description: 'サーバーエラー' },
  },
});

/**
 * 訪問済みの行きたいリストと過去の計画に登録したスポットを取得
 */
export const getVisitedSpotsRoute = createRoute({
  method: 'get',
  path: '/visited',
  tags: ['Spots'],
  summary: '訪問済みと過去の計画に登録したスポットを取得',
  description:
    'ユーザーが訪問済みとして登録したスポットと過去の旅行計画に含まれたスポットを取得します。都道府県でフィルタリング、訪問日・追加日でソートできます。重複は除外されます。',
  request: {
    query: VisitedSpotsQuerySchema,
  },
  responses: {
    200: {
      description: '訪問済みスポット一覧の取得成功',
      content: {
        'application/json': {
          schema: VisitedSpotsResponseSchema,
        },
      },
    },
    401: { description: '認証エラー - ログインが必要です' },
    500: { description: 'サーバーエラー' },
  },
});
