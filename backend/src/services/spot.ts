import { eq, and, gte, lte } from 'drizzle-orm';
import { db, wishlist, spot, spotMeta, planSpot, plan, trip } from '@db';

import type { UnvisitedSpotsQuery, VisitedSpotsQuery } from '@/models/spot';

/**
 * 未訪問の行きたいリストに登録しているスポットを取得
 * - ユーザー単位で抽出
 * - フィルター・ソートに対応
 * - Spot と SpotMeta を含めて返却
 * @param userId ユーザーID
 * @param query フィルター・ソートパラメータ
 */
export async function getUnvisitedWishlistSpots(
  userId: string,
  query: UnvisitedSpotsQuery = { sortBy: 'priority', sortOrder: 'desc' },
) {
  const { prefecture, priority, sortBy, sortOrder } = query;

  // Drizzle relational queryで取得
  let rows = await db.query.wishlist.findMany({
    where: and(
      eq(wishlist.userId, userId),
      eq(wishlist.visited, 0),
      priority !== undefined ? eq(wishlist.priority, priority) : undefined,
    ),
    with: {
      spot: {
        with: {
          meta: true,
        },
      },
    },
  });

  // 都道府県フィルター（metaは配列なので最初の要素を使用）
  if (prefecture) {
    rows = rows.filter((w) => {
      const meta = Array.isArray(w.spot?.meta) ? w.spot.meta[0] : w.spot?.meta;
      return meta?.prefecture === prefecture;
    });
  }

  // ソート（JavaScript側でソート）
  rows.sort((a, b) => {
    if (sortBy === 'priority') {
      const cmp = (b.priority ?? 0) - (a.priority ?? 0);
      if (sortOrder === 'asc') return -cmp;
      if (cmp !== 0) return cmp;
    } else if (sortBy === 'createdAt') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const cmp = dateB - dateA;
      if (sortOrder === 'asc') return -cmp;
      if (cmp !== 0) return cmp;
    }
    // 同一値の場合はIDでソート
    return a.id - b.id;
  });

  // レスポンス形式を既存のPrisma形式に合わせる（meta配列を単一オブジェクトに変換）
  return rows.map((row) => ({
    ...row,
    spot: {
      id: row.spot?.id,
      meta: Array.isArray(row.spot?.meta) ? row.spot.meta[0] || null : row.spot?.meta || null,
    },
  }));
}

/**
 * 訪問済みの行きたいリストと過去に計画で登録したスポットを取得
 * - 訪問済みスポット
 * - 計画として登録したスポット（出発地・目的地は除外）
 * - 重複は除外（訪問済み優先、計画内の重複も除外）
 * - フィルター・ソートに対応
 * @param userId ユーザーID
 * @param query フィルター・ソートパラメータ
 */
export async function getVisitedSpots(
  userId: string,
  query: VisitedSpotsQuery = { sortBy: 'visitedAt', sortOrder: 'desc' },
) {
  const { prefecture, dateFrom, dateTo, minVisitCount, sortBy, sortOrder } = query;

  // ヘルパー関数：配列のmetaを単一オブジェクトに変換
  const getMeta = (spotData: { meta?: unknown[] | unknown } | null | undefined) => {
    if (!spotData) return null;
    return Array.isArray(spotData.meta) ? spotData.meta[0] || null : spotData.meta || null;
  };

  // 1. 訪問済みのwishlistを取得
  let visitedWishlist = await db.query.wishlist.findMany({
    where: and(
      eq(wishlist.userId, userId),
      eq(wishlist.visited, 1),
      dateFrom ? gte(wishlist.visitedAt, dateFrom) : undefined,
      dateTo ? lte(wishlist.visitedAt, dateTo) : undefined,
    ),
    with: {
      spot: {
        with: {
          meta: true,
        },
      },
    },
  });

  // 都道府県フィルター
  if (prefecture) {
    visitedWishlist = visitedWishlist.filter((w) => {
      const meta = getMeta(w.spot);
      return meta?.prefecture === prefecture;
    });
  }

  // ソート
  visitedWishlist.sort((a, b) => {
    if (sortBy === 'visitedAt') {
      const dateA = a.visitedAt ? new Date(a.visitedAt).getTime() : 0;
      const dateB = b.visitedAt ? new Date(b.visitedAt).getTime() : 0;
      const cmp = dateB - dateA;
      if (sortOrder === 'asc') return -cmp;
      if (cmp !== 0) return cmp;
    } else if (sortBy === 'createdAt') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const cmp = dateB - dateA;
      if (sortOrder === 'asc') return -cmp;
      if (cmp !== 0) return cmp;
    }
    return a.id - b.id;
  });

  // 2. 過去の計画から登録したスポットを取得（出発地・目的地を除外）
  let planSpots = await db.query.planSpot.findMany({
    with: {
      spot: {
        with: {
          meta: true,
        },
      },
      plan: {
        with: {
          trip: true,
        },
      },
    },
  });

  // ユーザーフィルター & 日付フィルター & 出発地・目的地除外
  planSpots = planSpots.filter((ps) => {
    if (ps.plan?.trip?.userId !== userId) return false;
    if (ps.spotId.startsWith('departure') || ps.spotId.startsWith('destination')) return false;
    if (dateFrom && ps.plan.date && ps.plan.date < dateFrom) return false;
    if (dateTo && ps.plan.date && ps.plan.date > dateTo) return false;
    if (prefecture) {
      const meta = getMeta(ps.spot);
      if (meta?.prefecture !== prefecture) return false;
    }
    return true;
  });

  // ソート
  planSpots.sort((a, b) => {
    if (sortBy === 'visitedAt' || sortBy === 'planDate') {
      const dateA = a.plan?.date || '';
      const dateB = b.plan?.date || '';
      const cmp = dateB.localeCompare(dateA);
      if (sortOrder === 'asc') return -cmp;
      if (cmp !== 0) return cmp;
    } else if (sortBy === 'createdAt') {
      const dateA = a.plan?.date || '';
      const dateB = b.plan?.date || '';
      const cmp = dateB.localeCompare(dateA);
      if (sortOrder === 'asc') return -cmp;
      if (cmp !== 0) return cmp;
    }
    return a.id - b.id;
  });

  // 4. 訪問済みwishlistのspotIdを取得（重複除外用）
  const visitedSpotIds = new Set(visitedWishlist.map((w) => w.spotId));

  // 5. planSpotsから以下を除外:
  //    - 訪問済みwishlistに含まれているもの
  //    - 出発地・目的地として設定されているもの（SpotのIDがdeparture/destinationで始まる）
  //    - 重複するspotId（最新の計画のもののみ残す）
  const seenPlanSpotIds = new Set<string>();
  const uniquePlanSpots = planSpots.filter((ps) => {
    // 出発地・目的地は除外（念のためダブルチェック）
    if (ps.spotId.startsWith('departure') || ps.spotId.startsWith('destination')) {
      return false;
    }
    // 訪問済みに含まれている場合は除外
    if (visitedSpotIds.has(ps.spotId)) {
      return false;
    }
    // 重複チェック（最初に出現したもののみ残す）
    if (seenPlanSpotIds.has(ps.spotId)) {
      return false;
    }
    seenPlanSpotIds.add(ps.spotId);
    return true;
  });

  // 6. 回数フィルター・ソートのための回数カウント
  const spotVisitCounts = new Map<string, number>();

  // 訪問済みwishlistの回数をカウント（各1回）
  visitedWishlist.forEach((w) => {
    spotVisitCounts.set(w.spotId, (spotVisitCounts.get(w.spotId) || 0) + 1);
  });

  // filteredPlanSpotsの回数をカウント（重複含む全件、出発地・目的地は除外）
  // 注意: 日付フィルター適用後のデータでカウント
  planSpots.forEach((ps) => {
    // 出発地・目的地は除外
    if (ps.spotId.startsWith('departure') || ps.spotId.startsWith('destination')) {
      return;
    }
    spotVisitCounts.set(ps.spotId, (spotVisitCounts.get(ps.spotId) || 0) + 1);
  });

  // 7. wishlist形式に変換（型を統一、metaを単一オブジェクトに変換）
  const planSpotResults = uniquePlanSpots.map((ps) => ({
    id: ps.id,
    spotId: ps.spotId,
    userId,
    memo: ps.memo,
    priority: 1, // デフォルト
    visited: 0, // 計画として登録したものは未訪問扱い
    visitedAt: ps.plan?.date,
    createdAt: new Date(),
    updatedAt: new Date(),
    spot: {
      id: ps.spot?.id,
      meta: getMeta(ps.spot),
    },
    user: { id: userId },
    planDate: ps.plan?.date, // ソート用に計画日を保持
    visitCount: spotVisitCounts.get(ps.spotId) || 1,
  }));

  // 訪問済みにも回数情報を追加 + metaを単一オブジェクトに変換
  const visitedWithCount = visitedWishlist.map((w) => ({
    ...w,
    spot: {
      id: w.spot?.id,
      meta: getMeta(w.spot),
    },
    visitCount: spotVisitCounts.get(w.spotId) || 1,
  }));

  // 8. minVisitCountフィルター適用
  let filteredVisitedByCount = visitedWithCount;
  let filteredPlanSpotsByCount = planSpotResults;

  if (minVisitCount !== undefined) {
    filteredVisitedByCount = visitedWithCount.filter((w) => (w.visitCount || 1) >= minVisitCount);
    filteredPlanSpotsByCount = planSpotResults.filter((ps) => (ps.visitCount || 1) >= minVisitCount);
  }

  // 9. ソートby visitCountの場合は結合後にソート
  if (sortBy === 'visitCount') {
    const combined = [...filteredVisitedByCount, ...filteredPlanSpotsByCount];
    combined.sort((a, b) => {
      const countA = a.visitCount || 1;
      const countB = b.visitCount || 1;
      if (sortOrder === 'desc') {
        return countB - countA;
      }
      return countA - countB;
    });
    return combined;
  }

  // 10. planDateソートの場合は計画スポットのみ対象
  if (sortBy === 'planDate') {
    const combined = [...filteredVisitedByCount, ...filteredPlanSpotsByCount];
    combined.sort((a, b) => {
      const dateA = (('planDate' in a && a.planDate ? a.planDate : a.visitedAt?.toString().split('T')[0]) ||
        '') as string;
      const dateB = (('planDate' in b && b.planDate ? b.planDate : b.visitedAt?.toString().split('T')[0]) ||
        '') as string;
      if (sortOrder === 'desc') {
        return dateB.localeCompare(dateA);
      }
      return dateA.localeCompare(dateB);
    });
    return combined;
  }

  // 11. 訪問済み→計画の順で結合（デフォルト）
  return [...filteredVisitedByCount, ...filteredPlanSpotsByCount];
}

export default {
  getUnvisitedWishlistSpots,
  getVisitedSpots,
};
