import { eq, lt, count, sql, inArray } from 'drizzle-orm';
import { db, trip, plan } from '@db';

/**
 * ユーザーIDごとの旅行プランの数を取得
 * @param userIds clerkに登録されているuserIdの配列
 * @returns ユーザーIDをキー、旅行プランの数を値とするオブジェクト
 */
export const countPlanByUserId = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return {};
  }

  const counts = await db
    .select({
      userId: trip.userId,
      count: count(),
    })
    .from(trip)
    .where(inArray(trip.userId, userIds))
    .groupBy(trip.userId);

  const countMap: Record<string, number> = {};
  counts.forEach((item) => {
    countMap[item.userId] = item.count;
  });

  return countMap;
};

/**
 * 総プラン数と前月からの増減数、平均旅程数を取得
 * @returns プラン統計情報
 */
export const getTripStatistics = async () => {
  // プランの総数を取得
  const [totalResult] = await db.select({ count: count() }).from(trip);
  const totalPlans = totalResult?.count ?? 0;

  // 当月の初日（0時0分0秒）を取得
  const firstDayOfCurrentMonth = new Date();
  firstDayOfCurrentMonth.setDate(1);
  firstDayOfCurrentMonth.setHours(0, 0, 0, 0);

  // 前月までのプラン数を取得
  const [lastMonthResult] = await db
    .select({ count: count() })
    .from(trip)
    .where(lt(trip.createdAt, firstDayOfCurrentMonth.toISOString()));
  const lastMonthPlans = lastMonthResult?.count ?? 0;

  // プランあたりの平均旅程数を取得
  const result = await db.execute<{ avg_days_per_plan: number }>(sql`
    SELECT
      COALESCE(plan_count / NULLIF(trip_count, 0), 0) AS avg_days_per_plan
    FROM (
      SELECT
        COUNT(DISTINCT p."tripId") AS trip_count,
        COUNT(p.id) AS plan_count
      FROM "public"."Trip" t
      LEFT JOIN "public"."Plan" p ON p."tripId" = t.id
    ) sub
  `);
  const averageDatePerUserPlan = Number(result.rows?.[0]?.avg_days_per_plan) || 0;

  return {
    totalPlans,
    planIncreaseFromLastMonth: totalPlans - lastMonthPlans,
    averageDatePerUserPlan,
  };
};
