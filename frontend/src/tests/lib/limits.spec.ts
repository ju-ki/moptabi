import { describe, it, expect } from 'vitest';

import {
  isWishlistLimitReached,
  isPlanLimitReached,
  isSpotsPerDayLimitReached,
  isPlanDaysLimitReached,
  getLimitErrorMessage,
} from '@/lib/limits';

describe('上限チェックユーティリティ', () => {
  describe('isWishlistLimitReached - 行きたいリスト上限チェック (F-1)', () => {
    it('current = limit − 1 の場合 false を返す', () => {
      expect(isWishlistLimitReached(19, 20)).toBe(false);
    });

    it('current = limit の場合 true を返す（backendと一致）', () => {
      expect(isWishlistLimitReached(20, 20)).toBe(true);
    });

    it('current < limit の場合 false を返す', () => {
      expect(isWishlistLimitReached(0, 20)).toBe(false);
      expect(isWishlistLimitReached(10, 20)).toBe(false);
    });

    it('current > limit の場合 true を返す', () => {
      expect(isWishlistLimitReached(21, 20)).toBe(true);
    });
  });

  describe('isPlanLimitReached - プラン作成数上限チェック (F-1)', () => {
    it('current = limit − 1 の場合 false を返す', () => {
      expect(isPlanLimitReached(4, 5)).toBe(false);
    });

    it('current = limit の場合 true を返す（backendと一致）', () => {
      expect(isPlanLimitReached(5, 5)).toBe(true);
    });
  });

  describe('isSpotsPerDayLimitReached - 1日あたりスポット数上限チェック (F-1)', () => {
    it('current = limit − 1 の場合 false を返す', () => {
      expect(isSpotsPerDayLimitReached(4, 5)).toBe(false);
    });

    it('current = limit の場合 true を返す（backendと一致）', () => {
      expect(isSpotsPerDayLimitReached(5, 5)).toBe(true);
    });
  });

  describe('isPlanDaysLimitReached - プラン日数上限チェック (F-2)', () => {
    it('days = limit の場合 false を返す', () => {
      expect(isPlanDaysLimitReached(3, 3)).toBe(false);
    });

    it('days = limit + 1 の場合 true を返す', () => {
      expect(isPlanDaysLimitReached(4, 3)).toBe(true);
    });

    it('days < limit の場合 false を返す', () => {
      expect(isPlanDaysLimitReached(1, 3)).toBe(false);
      expect(isPlanDaysLimitReached(2, 3)).toBe(false);
    });
  });

  describe('getLimitErrorMessage - エラーメッセージ取得 (F-3)', () => {
    it('渡した上限値がwishlistメッセージに含まれる', () => {
      const msg = getLimitErrorMessage('wishlist', 20);
      expect(msg).toContain('行きたいリスト');
      expect(msg).toContain('20');
    });

    it('渡した上限値がplansメッセージに含まれる', () => {
      const msg = getLimitErrorMessage('plans', 5);
      expect(msg).toContain('プラン');
      expect(msg).toContain('5');
    });

    it('渡した上限値がspotsPerDayメッセージに含まれる', () => {
      const msg = getLimitErrorMessage('spotsPerDay', 5);
      expect(msg).toContain('スポット');
      expect(msg).toContain('5');
    });

    it('渡した上限値がplanDaysメッセージに含まれる', () => {
      const msg = getLimitErrorMessage('planDays', 3);
      expect(msg).toContain('日数');
      expect(msg).toContain('3');
    });

    it('渡した上限値がuserLocationsメッセージに含まれる', () => {
      const msg = getLimitErrorMessage('userLocations', 2);
      expect(msg).toContain('2');
    });
  });
});
