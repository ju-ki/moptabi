import { PrismaClient, Prisma } from '@/generated/prisma';
import type { UnvisitedSpotsQuery, VisitedSpotsQuery } from '@/models/spot';
// TODO: PrismaClientをDIで渡すように変更する
const prisma = new PrismaClient();

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

  // フィルター条件を構築
  const where: Prisma.WishlistWhereInput = {
    userId,
    visited: 0,
    // 優先度フィルター
    ...(priority !== undefined && { priority }),
    // 都道府県フィルター
    ...(prefecture && {
      spot: {
        meta: {
          prefecture,
        },
      },
    }),
  };

  // ソート条件を構築
  const orderBy: Prisma.WishlistOrderByWithRelationInput[] = [];
  if (sortBy === 'priority') {
    orderBy.push({ priority: sortOrder });
  } else if (sortBy === 'createdAt') {
    orderBy.push({ createdAt: sortOrder });
  }
  // 同一値の場合はIDでソート
  orderBy.push({ id: 'asc' });

  const rows = await prisma.wishlist.findMany({
    where,
    include: { spot: { include: { meta: true } } },
    orderBy,
  });
  return rows;
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

  // 1. 訪問済みのwishlistを取得
  const visitedWishlistWhere: Prisma.WishlistWhereInput = {
    userId,
    visited: 1,
    ...(prefecture && {
      spot: {
        meta: {
          prefecture,
        },
      },
    }),
    // 期間フィルター（訪問日時）
    ...(dateFrom || dateTo
      ? {
          visitedAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  // 訪問済みwishlistのソート条件
  const wishlistOrderBy: Prisma.WishlistOrderByWithRelationInput[] = [];
  if (sortBy === 'visitedAt') {
    wishlistOrderBy.push({ visitedAt: sortOrder });
  } else if (sortBy === 'createdAt') {
    wishlistOrderBy.push({ createdAt: sortOrder });
  }
  wishlistOrderBy.push({ id: 'asc' });

  const visitedWishlist = await prisma.wishlist.findMany({
    where: visitedWishlistWhere,
    include: { spot: { include: { meta: true } } },
    orderBy: wishlistOrderBy,
  });

  // 2. 過去の計画から登録したスポットを取得（出発地・目的地を除外）
  // 出発地・目的地はSpotのIDが「departure」または「destination」で始まる
  const planSpotsWhere: Prisma.PlanSpotWhereInput = {
    plan: {
      trip: {
        userId,
      },
      // 期間フィルター（計画日）
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    },
    // 出発地・目的地を除外（SpotのIDがdepartureまたはdestinationで始まるものを除外）
    AND: [
      {
        spot: {
          id: {
            not: {
              startsWith: 'departure',
            },
          },
        },
      },
      {
        spot: {
          id: {
            not: {
              startsWith: 'destination',
            },
          },
        },
      },
    ],
    ...(prefecture && {
      spot: {
        meta: {
          prefecture,
        },
      },
    }),
  };

  // 計画スポットのソート条件
  const planSpotOrderBy: Prisma.PlanSpotOrderByWithRelationInput[] = [];
  if (sortBy === 'visitedAt' || sortBy === 'planDate') {
    // visitedAtまたはplanDateの場合は計画日時でソート
    planSpotOrderBy.push({ plan: { date: sortOrder } });
  } else if (sortBy === 'createdAt') {
    planSpotOrderBy.push({ plan: { date: sortOrder } });
  }
  planSpotOrderBy.push({ id: 'asc' });

  const planSpots = await prisma.planSpot.findMany({
    where: planSpotsWhere,
    include: {
      spot: { include: { meta: true } },
      plan: { include: { trip: true } },
    },
    orderBy: planSpotOrderBy,
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

  // 7. wishlist形式に変換（型を統一）
  const planSpotResults = uniquePlanSpots.map((ps) => ({
    id: ps.id,
    spotId: ps.spotId,
    userId,
    memo: ps.memo,
    priority: 1, // デフォルト
    visited: 0, // 計画として登録したものは未訪問扱い
    visitedAt: ps.plan.date,
    createdAt: new Date(),
    updatedAt: new Date(),
    spot: ps.spot,
    user: { id: userId },
    planDate: ps.plan.date, // ソート用に計画日を保持
    visitCount: spotVisitCounts.get(ps.spotId) || 1,
  }));

  // 訪問済みにも回数情報を追加
  const visitedWithCount = visitedWishlist.map((w) => ({
    ...w,
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
      const dateA = (('planDate' in a && a.planDate ? a.planDate : a.visitedAt?.toISOString().split('T')[0]) ||
        '') as string;
      const dateB = (('planDate' in b && b.planDate ? b.planDate : b.visitedAt?.toISOString().split('T')[0]) ||
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
