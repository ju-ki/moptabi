import { APP_LIMITS } from '@/data/constants';

/**
 * 上限エラーメッセージの種類
 */
export type LimitType = 'wishlist' | 'plan' | 'spotsPerDay' | 'planDays';

/**
 * 上限エラーメッセージを取得
 */
export const LIMIT_ERROR_MESSAGES: Record<LimitType, string> = {
  wishlist: `行きたいリストの登録上限（${APP_LIMITS.MAX_WISHLIST_SPOTS}件）に達しています`,
  plan: `プランの作成上限（${APP_LIMITS.MAX_PLANS}件）に達しています`,
  spotsPerDay: `1日あたりのスポット登録上限（${APP_LIMITS.MAX_SPOTS_PER_DAY}件）に達しています`,
  planDays: `プランの日数上限（${APP_LIMITS.MAX_PLAN_DAYS}日）を超えています`,
};

/**
 * 行きたいリストの上限に達しているかチェック
 * @param currentCount 現在の登録数
 * @returns 上限に達している場合はtrue
 */
export const isWishlistLimitReached = (currentCount: number): boolean => {
  return currentCount >= APP_LIMITS.MAX_WISHLIST_SPOTS;
};

/**
 * プラン作成数の上限に達しているかチェック
 * @param currentCount 現在のプラン数
 * @returns 上限に達している場合はtrue
 */
export const isPlanLimitReached = (currentCount: number): boolean => {
  return currentCount >= APP_LIMITS.MAX_PLANS;
};

/**
 * 1日あたりのスポット数の上限に達しているかチェック
 * @param spotCount スポット数
 * @returns 上限に達している場合はtrue
 */
export const isSpotsPerDayLimitReached = (spotCount: number): boolean => {
  return spotCount >= APP_LIMITS.MAX_SPOTS_PER_DAY;
};

/**
 * プラン日数の上限に達しているかチェック
 * @param daysCount 日数
 * @returns 上限に達している場合はtrue
 */
export const isPlanDaysLimitReached = (daysCount: number): boolean => {
  return daysCount >= APP_LIMITS.MAX_PLAN_DAYS;
};

/**
 * 上限エラーメッセージを取得
 * @param type 上限の種類
 * @returns エラーメッセージ
 */
export const getLimitErrorMessage = (type: LimitType): string => {
  return LIMIT_ERROR_MESSAGES[type];
};

/**
 * 残り登録可能件数を取得
 * @param current 現在の件数
 * @param limit 上限
 * @returns 残り件数（0以上）
 */
export const getRemainingCount = (current: number, limit: number): number => {
  const remaining = limit - current;
  return remaining > 0 ? remaining : 0;
};

/**
 * 上限に近づいているかチェック（80%以上）
 * @param current 現在の件数
 * @param limit 上限
 * @returns 80%以上の場合はtrue
 */
export const isApproachingLimit = (current: number, limit: number): boolean => {
  if (limit === 0) return false;
  return current / limit >= 0.8;
};
