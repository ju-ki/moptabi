import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { UnvisitedSpotsQuery, VisitedSpotsQuery } from '@/models/spot';
import {
  getUnvisitedWishlistSpots as fetchUnvisitedWishlistSpots,
  getVisitedSpots as fetchVisitedSpots,
} from '@/services/spot';

/**
 * 未訪問の行きたいリストに登録しているスポットを取得
 * - ユーザー認証が必要
 * - フィルター・ソートパラメータに対応
 */
export const getUnvisitedSpots = async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  // クエリパラメータを取得
  const query: UnvisitedSpotsQuery = {
    prefecture: c.req.query('prefecture') || undefined,
    priority: c.req.query('priority') ? Number(c.req.query('priority')) : undefined,
    sortBy: (c.req.query('sortBy') as 'priority' | 'createdAt') || 'priority',
    sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
  };

  const spots = await fetchUnvisitedWishlistSpots(auth.userId, query);
  return c.json(spots, 200);
};

/**
 * 訪問済みの行きたいリストと過去の計画に登録したスポットを取得
 * - ユーザー認証が必要
 * - フィルター・ソートパラメータに対応
 * - 重複は除外
 */
export const getVisitedSpots = async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  // クエリパラメータを取得
  const query: VisitedSpotsQuery = {
    dateFrom: c.req.query('dateFrom') || undefined,
    dateTo: c.req.query('dateTo') || undefined,
    minVisitCount: c.req.query('minVisitCount') ? Number(c.req.query('minVisitCount')) : undefined,
    prefecture: c.req.query('prefecture') || undefined,
    sortBy: (c.req.query('sortBy') as 'visitedAt' | 'createdAt') || 'visitedAt',
    sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
  };

  const spots = await fetchVisitedSpots(auth.userId, query);
  return c.json(spots, 200);
};

export const spotHandler = {
  getUnvisitedSpots,
  getVisitedSpots,
};
