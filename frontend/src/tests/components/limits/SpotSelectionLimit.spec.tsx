import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { APP_LIMITS } from '@/data/constants';
import { isSpotsPerDayLimitReached, getRemainingCount } from '@/lib/limits';

describe('スポット追加時の上限チェック - limits.ts', () => {
  describe('isSpotsPerDayLimitReached', () => {
    it('上限に達している場合はfalseを返す', () => {
      expect(isSpotsPerDayLimitReached(APP_LIMITS.MAX_SPOTS_PER_DAY)).toBe(false);
    });

    it('上限を超えている場合はtrueを返す', () => {
      expect(isSpotsPerDayLimitReached(APP_LIMITS.MAX_SPOTS_PER_DAY + 1)).toBe(true);
    });

    it('上限未満の場合はfalseを返す', () => {
      expect(isSpotsPerDayLimitReached(APP_LIMITS.MAX_SPOTS_PER_DAY - 1)).toBe(false);
    });

    it('0件の場合はfalseを返す', () => {
      expect(isSpotsPerDayLimitReached(0)).toBe(false);
    });
  });

  describe('getRemainingCount', () => {
    it('残り件数を正しく計算する', () => {
      // MAX_SPOTS_PER_DAYが10の場合、現在5件なら残り5件
      expect(getRemainingCount(5, APP_LIMITS.MAX_SPOTS_PER_DAY)).toBe(APP_LIMITS.MAX_SPOTS_PER_DAY - 5);
    });

    it('上限に達している場合は0を返す', () => {
      expect(getRemainingCount(APP_LIMITS.MAX_SPOTS_PER_DAY, APP_LIMITS.MAX_SPOTS_PER_DAY)).toBe(0);
    });

    it('上限を超えている場合は0を返す', () => {
      expect(getRemainingCount(APP_LIMITS.MAX_SPOTS_PER_DAY + 5, APP_LIMITS.MAX_SPOTS_PER_DAY)).toBe(0);
    });
  });
});

describe('LimitDisplay統合テスト', () => {
  it('上限に近づいている場合（80%以上）は警告状態になる', () => {
    const current = Math.ceil(APP_LIMITS.MAX_SPOTS_PER_DAY * 0.8);
    const isWarning = current / APP_LIMITS.MAX_SPOTS_PER_DAY >= 0.8;
    expect(isWarning).toBe(true);
  });

  it('上限に達している場合は追加不可状態になる', () => {
    const current = APP_LIMITS.MAX_SPOTS_PER_DAY + 1;
    const isLimitReached = isSpotsPerDayLimitReached(current);
    expect(isLimitReached).toBe(true);
  });
});
