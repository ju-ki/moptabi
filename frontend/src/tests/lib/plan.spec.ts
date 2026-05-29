import { beforeEach, describe, expect, it } from 'vitest';

import { useStoreForPlanning } from '@/lib/plan';

describe('useStoreForPlanning', () => {
  beforeEach(() => {
    useStoreForPlanning.getState().resetPlanningStore();
  });

  it('ストア全体初期化を実行した場合、作成画面の状態が初期値に戻ること', () => {
    const store = useStoreForPlanning.getState();

    store.setFields('title', 'テストタイトル');
    store.setFields('startDate', '2026-06-01');
    store.setFields('endDate', '2026-06-02');
    store.setFields('plans', [{ date: '2026-06-01', spots: [], departure: {} as any, destination: {} as any }]);
    store.setFields('tripInfo', [{ date: '2026-06-01', memo: 'test', genreId: 1, transportationMethod: 1 }]);
    store.setIsLocationLinked(true);
    store.setErrors({ title: 'error' });
    store.setTripInfoErrors('2026-06-01', { memo: 'error' });
    store.setPlanErrors('2026-06-01', { spots: 'error' });
    store.setSpotErrors('2026-06-01', { memo: 'error' });
    store.setPlanningInfo('2026-06-01', { transportationMethodId: [1] } as any);
    store.setPlanningResult('2026-06-01', { routes: [] } as any);
    store.setSimulationStatus({ date: '2026-06-01', status: 2 });

    store.resetPlanningStore();

    const resetStore = useStoreForPlanning.getState();

    expect(resetStore.title).toBe('');
    expect(resetStore.startDate).toBe('');
    expect(resetStore.endDate).toBe('');
    expect(resetStore.tripInfo).toEqual([]);
    expect(resetStore.plans).toEqual([]);
    expect(resetStore.isLocationLinked).toBe(false);
    expect(resetStore.errors).toEqual({});
    expect(resetStore.tripInfoErrors).toEqual({});
    expect(resetStore.planErrors).toEqual({});
    expect(resetStore.spotErrors).toEqual({});
    expect(resetStore.planningInfo).toEqual({});
    expect(resetStore.planningResults).toEqual({});
    expect(resetStore.simulationStatus).toBeNull();
    expect(resetStore.id).toBeUndefined();
    expect(resetStore.imageUrl).toBe('');
    expect(resetStore.departureList).toEqual({ favorites: [], history: [] });
    expect(resetStore.destinationList).toEqual({ favorites: [], history: [] });
  });
});
