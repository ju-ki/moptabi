import { describe, expect, it } from 'vitest';
import { UserLimitSchema } from '@shared/user/schema';
import { DEFAULT_USER_LIMITS, buildLimitErrorMessage } from '@shared/user/types';

const validLimit = {
  maxWishlistSpots: 20,
  maxPlans: 5,
  maxSpotsPerDay: 5,
  maxPlanDays: 3,
  maxUserLocations: 2,
};

describe('🧾 UserLimit スキーマ検証', () => {
  describe('DEFAULT_USER_LIMITS', () => {
    it('既定値が正しく設定されている', () => {
      expect(DEFAULT_USER_LIMITS).toEqual(validLimit);
    });
  });

  describe('UserLimitSchema - 正常系', () => {
    it('5項目すべて正の整数の場合パースに成功する (S-1)', () => {
      const result = UserLimitSchema.safeParse(validLimit);
      expect(result.success).toBe(true);
    });
  });

  describe('UserLimitSchema - 異常系 (S-2)', () => {
    it('maxWishlistSpotsが0の場合パースに失敗する', () => {
      const result = UserLimitSchema.safeParse({ ...validLimit, maxWishlistSpots: 0 });
      expect(result.success).toBe(false);
    });

    it('maxPlansが負数の場合パースに失敗する', () => {
      const result = UserLimitSchema.safeParse({ ...validLimit, maxPlans: -1 });
      expect(result.success).toBe(false);
    });

    it('maxSpotsPerDayが小数の場合パースに失敗する', () => {
      const result = UserLimitSchema.safeParse({ ...validLimit, maxSpotsPerDay: 1.5 });
      expect(result.success).toBe(false);
    });

    it('maxPlanDaysが文字列の場合パースに失敗する', () => {
      const result = UserLimitSchema.safeParse({ ...validLimit, maxPlanDays: '3' });
      expect(result.success).toBe(false);
    });

    it('maxUserLocationsが0の場合パースに失敗する', () => {
      const result = UserLimitSchema.safeParse({ ...validLimit, maxUserLocations: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('UserLimitSchema - 項目欠落 (S-3)', () => {
    it('maxWishlistSpotsが欠落している場合パースに失敗する', () => {
      const { maxWishlistSpots: _, ...rest } = validLimit;
      const result = UserLimitSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('maxPlansが欠落している場合パースに失敗する', () => {
      const { maxPlans: _, ...rest } = validLimit;
      const result = UserLimitSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('maxSpotsPerDayが欠落している場合パースに失敗する', () => {
      const { maxSpotsPerDay: _, ...rest } = validLimit;
      const result = UserLimitSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('maxPlanDaysが欠落している場合パースに失敗する', () => {
      const { maxPlanDays: _, ...rest } = validLimit;
      const result = UserLimitSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('maxUserLocationsが欠落している場合パースに失敗する', () => {
      const { maxUserLocations: _, ...rest } = validLimit;
      const result = UserLimitSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('buildLimitErrorMessage', () => {
    it('wishlistのメッセージに上限値が含まれる', () => {
      const msg = buildLimitErrorMessage('wishlist', 20);
      expect(msg).toContain('20');
    });

    it('plansのメッセージに上限値が含まれる', () => {
      const msg = buildLimitErrorMessage('plans', 5);
      expect(msg).toContain('5');
    });

    it('spotsPerDayのメッセージに上限値が含まれる', () => {
      const msg = buildLimitErrorMessage('spotsPerDay', 5);
      expect(msg).toContain('5');
    });

    it('planDaysのメッセージに上限値が含まれる', () => {
      const msg = buildLimitErrorMessage('planDays', 3);
      expect(msg).toContain('3');
    });

    it('userLocationsのメッセージに上限値が含まれる', () => {
      const msg = buildLimitErrorMessage('userLocations', 2);
      expect(msg).toContain('2');
    });
  });
});
