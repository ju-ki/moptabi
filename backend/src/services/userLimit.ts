import { eq } from 'drizzle-orm';
import { DEFAULT_USER_LIMITS, UserLimitType } from '@shared/user/types';

import { AnyDbType, userLimit } from '@/db';

export const getUserLimits = async (db: AnyDbType, userId: string): Promise<UserLimitType> => {
  const [row] = await db.select().from(userLimit).where(eq(userLimit.userId, userId)).limit(1);

  if (!row) {
    return { ...DEFAULT_USER_LIMITS };
  }

  return {
    maxWishlistSpots: row.maxWishlistSpots,
    maxPlans: row.maxPlans,
    maxSpotsPerDay: row.maxSpotsPerDay,
    maxPlanDays: row.maxPlanDays,
    maxUserLocations: row.maxUserLocations,
  };
};

export const createDefaultUserLimit = async (db: AnyDbType, userId: string): Promise<void> => {
  await db
    .insert(userLimit)
    .values({
      userId,
      ...DEFAULT_USER_LIMITS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
};
