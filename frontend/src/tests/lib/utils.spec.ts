import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTomorrowDateString } from '@/lib/utils';

describe('getTomorrowDateString', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['通常日', new Date(2026, 9, 8), '2026-10-09'],
    ['月末', new Date(2026, 9, 31), '2026-11-01'],
    ['年末', new Date(2026, 11, 31), '2027-01-01'],
    ['うるう年の2月28日', new Date(2028, 1, 28), '2028-02-29'],
    ['日付が変わる直前', new Date(2026, 9, 8, 23, 59, 59), '2026-10-09'],
  ])('%sの翌日をYYYY-MM-DD形式で返すこと', (_, baseDate, expected) => {
    expect(getTomorrowDateString(baseDate)).toBe(expected);
  });

  it('引数を省略した場合は現在日時の翌日を返すこと', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 8, 10, 0, 0));

    expect(getTomorrowDateString()).toBe('2026-10-09');
  });
});
