import { describe, it, expect } from 'vitest';

import { APP_LIMITS } from '@/data/constants';
import {
  isWishlistLimitReached,
  isPlanLimitReached,
  isSpotsPerDayLimitReached,
  isPlanDaysLimitReached,
  getLimitErrorMessage,
} from '@/lib/limits';

describe('🔒 上限チェックユーティリティ関数', () => {
  describe('isWishlistLimitReached - 行きたいリスト上限チェック', () => {
    it('上限未満の場合はfalseを返す', () => {
      expect(isWishlistLimitReached(0)).toBe(false);
      expect(isWishlistLimitReached(50)).toBe(false);
      expect(isWishlistLimitReached(99)).toBe(false);
    });

    it('上限に達している場合はfalseを返す', () => {
      expect(isWishlistLimitReached(APP_LIMITS.MAX_WISHLIST_SPOTS)).toBe(false);
    });

    it('上限を超えている場合もtrueを返す', () => {
      expect(isWishlistLimitReached(APP_LIMITS.MAX_WISHLIST_SPOTS + 1)).toBe(true);
    });
  });

  describe('isPlanLimitReached - プラン作成数上限チェック', () => {
    it('上限未満の場合はfalseを返す', () => {
      expect(isPlanLimitReached(0)).toBe(false);
      expect(isPlanLimitReached(10)).toBe(false);
      expect(isPlanLimitReached(19)).toBe(false);
    });

    it('上限に達している場合はfalseを返す', () => {
      expect(isPlanLimitReached(APP_LIMITS.MAX_PLANS)).toBe(false);
    });

    it('上限を超えている場合もtrueを返す', () => {
      expect(isPlanLimitReached(APP_LIMITS.MAX_PLANS + 1)).toBe(true);
    });
  });

  describe('isSpotsPerDayLimitReached - 1日あたりスポット数上限チェック', () => {
    it('上限未満の場合はfalseを返す', () => {
      expect(isSpotsPerDayLimitReached(0)).toBe(false);
      expect(isSpotsPerDayLimitReached(5)).toBe(false);
      expect(isSpotsPerDayLimitReached(9)).toBe(false);
    });

    it('上限に達している場合はfalseを返す', () => {
      expect(isSpotsPerDayLimitReached(APP_LIMITS.MAX_SPOTS_PER_DAY)).toBe(false);
    });

    it('上限を超えている場合もtrueを返す', () => {
      expect(isSpotsPerDayLimitReached(APP_LIMITS.MAX_SPOTS_PER_DAY + 1)).toBe(true);
    });
  });

  describe('isPlanDaysLimitReached - プラン日数上限チェック', () => {
    it('上限未満の場合はfalseを返す', () => {
      expect(isPlanDaysLimitReached(0)).toBe(false);
      expect(isPlanDaysLimitReached(APP_LIMITS.MAX_PLAN_DAYS - 1)).toBe(false);
    });

    it('上限に達している場合はfalseを返す', () => {
      expect(isPlanDaysLimitReached(APP_LIMITS.MAX_PLAN_DAYS)).toBe(false);
    });

    it('上限を超えている場合もtrueを返す', () => {
      expect(isPlanDaysLimitReached(APP_LIMITS.MAX_PLAN_DAYS + 1)).toBe(true);
    });
  });

  describe('getLimitErrorMessage - エラーメッセージ取得', () => {
    it('wishlistタイプのエラーメッセージを返す', () => {
      expect(getLimitErrorMessage('wishlist')).toContain('行きたいリスト');
      expect(getLimitErrorMessage('wishlist')).toContain(String(APP_LIMITS.MAX_WISHLIST_SPOTS));
    });

    it('planタイプのエラーメッセージを返す', () => {
      expect(getLimitErrorMessage('plan')).toContain('プラン');
      expect(getLimitErrorMessage('plan')).toContain(String(APP_LIMITS.MAX_PLANS));
    });

    it('spotsPerDayタイプのエラーメッセージを返す', () => {
      expect(getLimitErrorMessage('spotsPerDay')).toContain('スポット');
      expect(getLimitErrorMessage('spotsPerDay')).toContain(String(APP_LIMITS.MAX_SPOTS_PER_DAY));
    });

    it('planDaysタイプのエラーメッセージを返す', () => {
      expect(getLimitErrorMessage('planDays')).toContain('日数');
      expect(getLimitErrorMessage('planDays')).toContain(String(APP_LIMITS.MAX_PLAN_DAYS));
    });
  });
});
