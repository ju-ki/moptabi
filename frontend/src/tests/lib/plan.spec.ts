import { beforeEach, describe, expect, it } from 'vitest';

import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType, type Spot } from '@/types/plan';

function createSpot(id: string, overrides: Partial<Spot> = {}): Spot {
  return {
    id,
    location: {
      id,
      name: `spot-${id}`,
      lat: 35,
      lng: 139,
    },
    stayStart: '09:00',
    stayEnd: '10:00',
    stayDuration: 60,
    transports: {
      transportMethod: 1,
      name: 'WALKING',
      fromType: TransportNodeType.SPOT,
      toType: TransportNodeType.SPOT,
    },
    order: 1,
    ...overrides,
  };
}

function setupPlannedDate(date: string, spots: Spot[]) {
  const store = useStoreForPlanning.getState();
  store.setFields('plans', [{ date, spots, departure: {} as any, destination: {} as any }]);
  store.setPlanningResult(date, { routes: [] } as any);
}

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

  it('プランニング後に並び順を変更した場合、対象日付がdirtyになること', () => {
    const date = '2026-06-01';
    setupPlannedDate(date, [createSpot('spot-1')]);

    const store = useStoreForPlanning.getState();
    store.editSpots(date, 'spot-1', { order: 2 });

    expect(store.isPlanningDirty(date)).toBe(true);
    expect(store.getDirtyPlanningDates()).toEqual([date]);
  });

  it('プランニング後にmemoのみ編集した場合、対象日付はdirtyにならないこと', () => {
    const date = '2026-06-01';
    setupPlannedDate(date, [createSpot('spot-1')]);

    const store = useStoreForPlanning.getState();
    store.editSpots(date, 'spot-1', { memo: 'メモのみ更新' });

    expect(store.isPlanningDirty(date)).toBe(false);
    expect(store.getDirtyPlanningDates()).toEqual([]);
  });

  it('復元操作を実行した場合、前回プランニング時点のスポット情報に戻りdirtyが解除されること', () => {
    const date = '2026-06-01';
    setupPlannedDate(date, [createSpot('spot-1', { stayDuration: 60 })]);

    const store = useStoreForPlanning.getState();
    store.editSpots(date, 'spot-1', { stayDuration: 120 });
    expect(store.isPlanningDirty(date)).toBe(true);

    store.restorePlannedSpots(date);

    const restoredSpot = store.getSpotInfo(date, TransportNodeType.SPOT)[0];
    expect(restoredSpot.stayDuration).toBe(60);
    expect(store.isPlanningDirty(date)).toBe(false);
    expect(store.getDirtyPlanningDates()).toEqual([]);
  });

  it('プランニング結果の再反映を実行した場合、dirtyが解除され復元先が最新状態になること', () => {
    const date = '2026-06-01';
    setupPlannedDate(date, [createSpot('spot-1', { stayDuration: 60, stayStart: '09:00', stayEnd: '10:00' })]);

    const store = useStoreForPlanning.getState();

    // 初回プランニング実行中にupdatedSpotsを反映すると、内部的にdirtyが立つ。
    store.editSpots(date, 'spot-1', { stayDuration: 75, stayStart: '09:30', stayEnd: '10:45' });
    expect(store.isPlanningDirty(date)).toBe(true);

    // プランニング反映完了時にスナップショットを再確定し、dirtyを解除する。
    store.setPlanningResult(date, { routes: [] } as any);
    expect(store.isPlanningDirty(date)).toBe(false);

    // その後の変更から復元したとき、再確定した最新状態へ戻ること。
    store.editSpots(date, 'spot-1', { stayDuration: 120 });
    expect(store.isPlanningDirty(date)).toBe(true);

    store.restorePlannedSpots(date);
    const restoredSpot = store.getSpotInfo(date, TransportNodeType.SPOT)[0];
    expect(restoredSpot.stayDuration).toBe(75);
    expect(restoredSpot.stayStart).toBe('09:30');
    expect(restoredSpot.stayEnd).toBe('10:45');
    expect(store.isPlanningDirty(date)).toBe(false);
  });

  it('プランニング後にルート候補の移動手段を切り替えた場合、対象日付がdirtyになること', () => {
    const date = '2026-06-01';
    const store = useStoreForPlanning.getState();

    store.setFields('plans', [
      {
        date,
        spots: [
          createSpot('spot-1', {
            transports: {
              transportMethod: 1,
              name: 'WALKING',
              fromType: TransportNodeType.SPOT,
              toType: TransportNodeType.SPOT,
              travelTime: '10分',
            },
          }),
        ],
        departure: {} as any,
        destination: {} as any,
      },
    ]);

    store.setPlanningResult(date, {
      routes: [
        {
          id: 'route-1',
          fromType: 'SPOT',
          toType: 'SPOT',
          fromSpotId: 'spot-1',
          transportMethod: 'WALKING',
          transportMethodId: 1,
          duration: 600,
          distance: 1200,
          durationText: '10分',
          distanceText: '1.2km',
          alternativeRoutes: [
            {
              transportMethod: 'DRIVING',
              transportMethodId: 3,
              duration: 300,
              distance: 1200,
              durationText: '5分',
              distanceText: '1.2km',
            },
          ],
        },
      ],
      totalDuration: 600,
      totalDistance: 1200,
    } as any);

    store.switchAlternativeRoute(date, 'route-1', 3);

    expect(store.isPlanningDirty(date)).toBe(true);
    expect(store.getDirtyPlanningDates()).toEqual([date]);
  });

  it('現在選択中の移動手段を反映した場合、表示情報は更新されるがdirtyにならないこと', () => {
    const date = '2026-06-01';
    const store = useStoreForPlanning.getState();

    store.setFields('plans', [
      {
        date,
        spots: [
          createSpot('spot-1', {
            transports: {
              transportMethod: 1,
              name: 'WALKING',
              fromType: TransportNodeType.SPOT,
              toType: TransportNodeType.SPOT,
              travelTime: '不明',
            },
          }),
        ],
        departure: {} as any,
        destination: {} as any,
      },
    ]);

    store.setPlanningResult(date, {
      routes: [
        {
          id: 'route-1',
          fromType: 'SPOT',
          toType: 'SPOT',
          fromSpotId: 'spot-1',
          transportMethod: 'WALKING',
          transportMethodId: 1,
          duration: 600,
          distance: 1200,
          durationText: '10分',
          distanceText: '1.2km',
          alternativeRoutes: [
            {
              transportMethod: 'DRIVING',
              transportMethodId: 3,
              duration: 300,
              distance: 1200,
              durationText: '5分',
              distanceText: '1.2km',
            },
          ],
        },
      ],
      totalDuration: 600,
      totalDistance: 1200,
    } as any);

    store.switchAlternativeRoute(date, 'route-1', 1);

    const updatedSpot = store.getSpotInfo(date, TransportNodeType.SPOT)[0];
    expect(updatedSpot.transports?.travelTime).toBe('10分');
    expect(updatedSpot.alternateRoutes?.length).toBe(1);
    expect(store.isPlanningDirty(date)).toBe(false);
    expect(store.getDirtyPlanningDates()).toEqual([]);
  });
});
