import { buildLimitErrorMessage, LimitType } from '@shared/user/types';

export type { LimitType };

export const isWishlistLimitReached = (currentCount: number, limit: number): boolean => {
  return currentCount >= limit;
};

export const isPlanLimitReached = (currentCount: number, limit: number): boolean => {
  return currentCount >= limit;
};

export const isSpotsPerDayLimitReached = (spotCount: number, limit: number): boolean => {
  return spotCount >= limit;
};

export const isPlanDaysLimitReached = (daysCount: number, limit: number): boolean => {
  return daysCount > limit;
};

export const getLimitErrorMessage = (type: LimitType, limit: number): string => {
  return buildLimitErrorMessage(type, limit);
};

export const getRemainingCount = (current: number, limit: number): number => {
  const remaining = limit - current;
  return remaining > 0 ? remaining : 0;
};

export const isApproachingLimit = (current: number, limit: number): boolean => {
  if (limit === 0) return false;
  return current / limit >= 0.8;
};
