import { buildLimitErrorMessage, LimitType } from '@shared/user/types';

export type { LimitType };

/**
 * 上限の取得に失敗したときに、上限に依存する操作を止める際の固定文言
 */
export const LIMIT_FETCH_ERROR_MESSAGE = {
  title: '上限を取得できませんでした',
  description: '通信状況を確認し、再試行してください。',
} as const;

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
