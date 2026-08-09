import { eq } from 'drizzle-orm/sql/expressions/conditions';
import { count } from 'drizzle-orm/sql/functions/aggregate';
import { HTTPException } from 'hono/http-exception';
import { TripType } from '@shared/trip/types';

import { APP_LIMITS, LIMIT_ERROR_MESSAGES } from '@/constants/limits';
import { AnyDbType, trip } from '@/db';

export const validateLimit = async (db: AnyDbType, userId: string, tripData: TripType): Promise<boolean> => {
  // 上限チェック: プラン作成数
  const [countResult] = await db.select({ count: count() }).from(trip).where(eq(trip.userId, userId));

  if ((countResult?.count ?? 0) >= APP_LIMITS.MAX_PLANS) {
    throw new HTTPException(400, { message: LIMIT_ERROR_MESSAGES.PLAN_LIMIT_EXCEEDED });
  }

  // 上限チェック: プラン日数
  if (tripData.plans.length > APP_LIMITS.MAX_PLAN_DAYS) {
    throw new HTTPException(400, { message: LIMIT_ERROR_MESSAGES.PLAN_DAYS_LIMIT_EXCEEDED });
  }

  // 上限チェック: 1日あたりスポット数
  for (const planData of tripData.plans) {
    if (planData.spots.length > APP_LIMITS.MAX_SPOTS_PER_DAY) {
      throw new HTTPException(400, { message: LIMIT_ERROR_MESSAGES.SPOTS_PER_DAY_LIMIT_EXCEEDED });
    }
  }
  return true;
};
