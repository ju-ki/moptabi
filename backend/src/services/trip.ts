import { prisma } from '@/lib/client';

/**
 * ユーザーIDごとの旅行プランの数を取得
 * @param userId clerkに登録されているuserIdの配列
 * @returns ユーザーIDをキー、旅行プランの数を値とするオブジェクト
 */
export const countPlanByUserId = async (userId: string[]) => {
  const counts = await prisma.trip.groupBy({
    by: ['userId'],
    where: {
      userId: {
        in: userId,
      },
    },
    _count: {
      userId: true,
    },
  });

  const countMap: Record<string, number> = {};
  counts.forEach((item) => {
    countMap[item.userId] = item._count.userId;
  });

  return countMap;
};

/**
 * 総プラン数と前月からの増減数、平均旅程数を取得
 * @returns プラン統計情報
 */
export const getTripStatistics = async () => {
  // プランの総数を取得
  const totalPlans = await prisma.trip.count();
  // 前月までのプラン数を取得
  // 当月の初日（0時0分0秒）を取得
  const firstDayOfCurrentMonth = new Date();
  firstDayOfCurrentMonth.setDate(1);
  firstDayOfCurrentMonth.setHours(0, 0, 0, 0);

  const lastMonthPlans = await prisma.trip.count({
    where: {
      createdAt: {
        lt: firstDayOfCurrentMonth,
      },
    },
  });

  // プランあたりの平均旅程数を取得
  const result = await prisma.$queryRaw<{ avg_days_per_plan: number }[]>`
  SELECT
    COALESCE(plan_count / NULLIF(trip_count, 0), 0) AS avg_days_per_plan
  FROM (
    SELECT
      COUNT(DISTINCT p."tripId") AS trip_count,
      COUNT(p.id) AS plan_count
    FROM "public"."Trip" t
    LEFT JOIN "public"."Plan" p ON p."tripId" = t.id
  ) sub;
`;
  const averageDatePerUserPlan = Number(result[0]?.avg_days_per_plan) || 0;

  return {
    totalPlans: totalPlans,
    planIncreaseFromLastMonth: totalPlans - lastMonthPlans,
    averageDatePerUserPlan: averageDatePerUserPlan,
  };
};
