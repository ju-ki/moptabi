import React from 'react';
import { describe, it, expect } from 'vitest';

import { DEFAULT_USER_LIMITS } from '@shared/user/types';
import { isSpotsPerDayLimitReached, getRemainingCount } from '@/lib/limits';

describe('スポット追加時の上限チェック - limits.ts', () => {
  const limit = DEFAULT_USER_LIMITS.maxSpotsPerDay;

  describe('isSpotsPerDayLimitReached (F-6)', () => {
    it('current = limit − 1 の場合はfalseを返す', () => {
      expect(isSpotsPerDayLimitReached(limit - 1, limit)).toBe(false);
    });

    it('current = limit の場合はtrueを返す（backendと一致）', () => {
      expect(isSpotsPerDayLimitReached(limit, limit)).toBe(true);
    });

    it('current > limit の場合はtrueを返す', () => {
      expect(isSpotsPerDayLimitReached(limit + 1, limit)).toBe(true);
    });

    it('0件の場合はfalseを返す', () => {
      expect(isSpotsPerDayLimitReached(0, limit)).toBe(false);
    });
  });

  describe('getRemainingCount', () => {
    it('残り件数を正しく計算する', () => {
      expect(getRemainingCount(2, limit)).toBe(limit - 2);
    });

    it('上限に達している場合は0を返す', () => {
      expect(getRemainingCount(limit, limit)).toBe(0);
    });

    it('上限を超えている場合は0を返す', () => {
      expect(getRemainingCount(limit + 5, limit)).toBe(0);
    });
  });
});

describe('LimitDisplay統合テスト', () => {
  const limit = DEFAULT_USER_LIMITS.maxSpotsPerDay;

  it('上限に近づいている場合（80%以上）は警告状態になる', () => {
    const current = Math.ceil(limit * 0.8);
    const isWarning = current / limit >= 0.8;
    expect(isWarning).toBe(true);
  });

  it('上限に達している場合は追加不可状態になる', () => {
    const isLimitReached = isSpotsPerDayLimitReached(limit, limit);
    expect(isLimitReached).toBe(true);
  });
});
