/**
 * アプリケーション全体の上限設定
 * レイアウト崩れやAPI制限対策のための制限値
 */
export const APP_LIMITS = {
  /** 行きたいリストの最大登録数 */
  MAX_WISHLIST_SPOTS: 100,
  /** プランの最大作成数 */
  MAX_PLANS: 20,
  /** 1日あたりの最大スポット数 */
  MAX_SPOTS_PER_DAY: 10,
  /** プランの最大日数 */
  MAX_PLAN_DAYS: 7,
} as const;

/**
 * エラーメッセージ
 */
export const LIMIT_ERROR_MESSAGES = {
  WISHLIST_LIMIT_EXCEEDED: `行きたいリストの登録上限（${APP_LIMITS.MAX_WISHLIST_SPOTS}件）に達しています`,
  PLAN_LIMIT_EXCEEDED: `プランの作成上限（${APP_LIMITS.MAX_PLANS}件）に達しています`,
  SPOTS_PER_DAY_LIMIT_EXCEEDED: `1日あたりのスポット登録上限（${APP_LIMITS.MAX_SPOTS_PER_DAY}件）に達しています`,
  PLAN_DAYS_LIMIT_EXCEEDED: `プランの日数上限（${APP_LIMITS.MAX_PLAN_DAYS}日）を超えています`,
} as const;
