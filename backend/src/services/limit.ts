import { eq } from 'drizzle-orm/sql/expressions/conditions';
import { count } from 'drizzle-orm/sql/functions/aggregate';
import { HTTPException } from 'hono/http-exception';
import { TripType } from '@shared/trip/types';
import { buildLimitErrorMessage } from '@shared/user/types';

import { AnyDbType, trip } from '@/db';
import { getUserLimits } from '@/services/userLimit';

export const validateLimit = async (
  db: AnyDbType,
  userId: string,
  tripData: TripType,
  options: { isUpdate?: boolean } = {},
): Promise<boolean> => {
  const limits = await getUserLimits(db, userId);

  // 作成時のみプラン作成数をチェック（更新時はスキップ）
  if (!options.isUpdate) {
    const [countResult] = await db.select({ count: count() }).from(trip).where(eq(trip.userId, userId));

    if ((countResult?.count ?? 0) >= limits.maxPlans) {
      throw new HTTPException(400, { message: buildLimitErrorMessage('plans', limits.maxPlans) });
    }
  }

  // 上限チェック: プラン日数
  if (tripData.plans.length > limits.maxPlanDays) {
    throw new HTTPException(400, { message: buildLimitErrorMessage('planDays', limits.maxPlanDays) });
  }

  // 上限チェック: 1日あたりスポット数
  for (const planData of tripData.plans) {
    if (planData.spots.length > limits.maxSpotsPerDay) {
      throw new HTTPException(400, { message: buildLimitErrorMessage('spotsPerDay', limits.maxSpotsPerDay) });
    }
  }
  return true;
};
