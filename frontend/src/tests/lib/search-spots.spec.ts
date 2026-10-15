import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchSpots } from '@/lib/plan';

/**
 * searchSpots が営業時間の判定用データ（No.158）を返すことを検証する
 */

// Google Maps JavaScript API はテスト環境で読み込めないため、searchSpots が使う範囲だけを stub する
const stubGoogleMaps = (places: Record<string, unknown>[]) => {
  vi.stubGlobal('google', {
    maps: {
      importLibrary: vi.fn().mockResolvedValue({
        Place: { searchByText: vi.fn().mockResolvedValue({ places }) },
        SearchNearbyRankPreference: {},
        SearchByTextRankPreference: {},
      }),
    },
  });
};

describe('searchSpots の営業時間データ', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('検索結果のスポットに判定用の営業時間と営業状況を含めること', async () => {
    stubGoogleMaps([
      {
        id: 'place-1',
        displayName: '美術館',
        location: { lat: () => 35.0, lng: () => 139.0 },
        regularOpeningHours: {
          periods: [{ open: { day: 2, hour: 10, minute: 0 }, close: { day: 2, hour: 17, minute: 0 } }],
        },
        businessStatus: 'CLOSED_PERMANENTLY',
      },
      {
        id: 'place-2',
        displayName: '公園',
        location: { lat: () => 35.1, lng: () => 139.1 },
      },
    ]);

    const spots = await searchSpots({
      searchWord: '美術館',
      radius: 1,
      sortOption: 'popularity',
      maxResultLimit: 20,
    });

    expect(spots[0].openingPeriods).toEqual([
      { open: { day: 2, hour: 10, minute: 0 }, close: { day: 2, hour: 17, minute: 0 } },
    ]);
    expect(spots[0].businessStatus).toBe('CLOSED_PERMANENTLY');
    expect(spots[1].openingPeriods).toBeUndefined();
    expect(spots[1].businessStatus).toBeUndefined();
  });
});
