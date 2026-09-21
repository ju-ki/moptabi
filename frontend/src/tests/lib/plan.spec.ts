import { beforeEach, describe, expect, it } from 'vitest';

import { useStoreForPlanning } from '@/lib/plan';
import { ExtendPlanLocationType, ExtendSpotType, TransportNodeType } from '@/types/plan';
import { PlanningInfo } from '@/lib/planning';

function createSpot(id: string, overrides: Partial<ExtendSpotType> = {}): ExtendSpotType {
  return {
    id,
    spotId: `spot-${id}`,
    name: `spot-${id}`,
    latitude: 35,
    longitude: 139,
    stayStart: '09:00',
    stayEnd: '10:00',
    stayDuration: 60,
    rating: 4,
    transportMethodId: 1,
    transportMethod: 'WALKING',
    travelTime: 10,
    order: 1,
    ...overrides,
  };
}

function createLocation(overrides: Partial<ExtendPlanLocationType> = {}): ExtendPlanLocationType {
  return {
    name: 'Location 1',
    latitude: 35,
    longitude: 139,
    transportMethod: 'TRANSIT',
    locationType: 'DEPARTURE',
    transportMethodId: 4,
    time: '09:00',
    travelTime: 10,
    alternateRoutes: [],
    ...overrides,
  };
}

function setupPlannedDate(date: string, spots: ExtendSpotType[]) {
  const store = useStoreForPlanning.getState();
  store.setFields('plans', [
    { date, spots, departure: {} as ExtendPlanLocationType, destination: {} as ExtendPlanLocationType },
  ]);
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
    store.setFields('plans', [
      {
        date: '2026-06-01',
        spots: [],
        departure: {} as ExtendPlanLocationType,
        destination: {} as ExtendPlanLocationType,
      },
    ]);
    store.setIsLocationLinked(true);
    store.setErrors({ title: 'error' });
    store.setPlanErrors('2026-06-01', { spots: 'error' });
    store.setSpotErrors('2026-06-01', { memo: 'error' });
    store.setPlanningInfo('2026-06-01', { transportationMethodId: [1] } as PlanningInfo);
    store.setPlanningResult('2026-06-01', { routes: [] } as any);
    store.setSimulationStatus({ date: '2026-06-01', status: 2 });

    store.resetPlanningStore();

    const resetStore = useStoreForPlanning.getState();

    expect(resetStore.title).toBe('');
    expect(resetStore.startDate).toBe('');
    expect(resetStore.endDate).toBe('');
    expect(resetStore.plans).toEqual([]);
    expect(resetStore.isLocationLinked).toBe(false);
    expect(resetStore.errors).toEqual({});
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

  describe('リセット後の最寄駅情報', () => {
    it('最寄駅情報更新後、更新前の状態に戻っていること', () => {
      const store = useStoreForPlanning.getState();
      const targetDate = '2026-06-01';

      // 期待される初期最寄駅情報
      const expectedDepartureNearestStation = {
        placeId: 'station-1',
        name: 'Station 1',
        latitude: 35.123,
        longitude: 139.456,
        stationType: 'BUS' as const,
        transitTime: 5,
        walkingTime: 3,
        spotId: 'departure-spot-1',
        scheduledDepartureTime: '09:15',
        scheduledDepartureTimes: ['09:15', '09:30'],
        waitingTime: 2,
      };

      const expectedSpotNearestStation = {
        placeId: 'station-3',
        name: 'Station 3',
        latitude: 35.789,
        longitude: 139.654,
        stationType: 'TRAIN' as const,
        transitTime: 8,
        walkingTime: 4,
        spotId: 'spot-1-station',
        scheduledDepartureTime: '10:00',
        scheduledDepartureTimes: ['10:00', '10:15'],
        waitingTime: 1,
      };

      const testSpot = createSpot('spot-1', {
        nearestStation: expectedSpotNearestStation,
      });

      // Arrange: 初期状態をセット
      store.setFields('title', 'テストタイトル');
      store.setFields('startDate', targetDate);
      store.setFields('endDate', '2026-06-02');
      store.setFields('plans', [
        {
          date: targetDate,
          spots: [testSpot],
          departure: createLocation({
            locationType: 'DEPARTURE',
            nearestStation: expectedDepartureNearestStation,
            travelTime: 12,
          }),
          destination: createLocation({
            locationType: 'DESTINATION',
            nearestStation: {
              placeId: 'station-2',
              name: 'Station 2',
              latitude: 35.999,
              longitude: 139.888,
              stationType: 'BUS' as const,
              transitTime: 0,
              walkingTime: 5,
              spotId: 'destination-spot',
            },
          }),
        },
      ]);

      // setPlanningResult で最寄駅情報をスナップショット
      store.setPlanningResult(targetDate, { routes: [] } as any);

      // 最寄駅情報を変更
      store.setDepartureAndDestination(targetDate, TransportNodeType.DEPARTURE, {
        ...createLocation({
          locationType: 'DEPARTURE',
          nearestStation: {
            placeId: 'station-999',
            name: 'Station 999 (Changed)',
            latitude: 36.0,
            longitude: 140.0,
            stationType: 'TRAIN' as const,
            transitTime: 20,
          },
        }),
      } as ExtendPlanLocationType);

      // Act: 復元実行
      store.restorePlannedSpots(targetDate);

      // Assert: 復元後の最寄駅情報が元の値と完全に一致することを検証
      const restoredDeparture = store.getDepartureAndDestination(targetDate, TransportNodeType.DEPARTURE);
      const restoredSpots = store.getSpotInfo(targetDate, TransportNodeType.SPOT);

      // 出発地の最寄駅情報を検証（8項目）
      expect(restoredDeparture?.nearestStation).toBeDefined();
      expect(restoredDeparture?.nearestStation?.placeId).toBe(expectedDepartureNearestStation.placeId);
      expect(restoredDeparture?.nearestStation?.name).toBe(expectedDepartureNearestStation.name);
      expect(restoredDeparture?.nearestStation?.latitude).toBe(expectedDepartureNearestStation.latitude);
      expect(restoredDeparture?.nearestStation?.longitude).toBe(expectedDepartureNearestStation.longitude);
      expect(restoredDeparture?.nearestStation?.stationType).toBe(expectedDepartureNearestStation.stationType);
      expect(restoredDeparture?.nearestStation?.spotId).toBe(expectedDepartureNearestStation.spotId);
      expect(restoredDeparture?.nearestStation?.transitTime).toBe(expectedDepartureNearestStation.transitTime);
      expect(restoredDeparture?.nearestStation?.scheduledDepartureTime).toBe(
        expectedDepartureNearestStation.scheduledDepartureTime,
      );
      expect(restoredDeparture?.nearestStation?.scheduledDepartureTimes).toEqual(
        expectedDepartureNearestStation.scheduledDepartureTimes,
      );

      // スポットの最寄駅情報を検証
      expect(restoredSpots.length).toBe(1);
      expect(restoredSpots[0]?.nearestStation).toBeDefined();
      expect(restoredSpots[0]?.nearestStation?.placeId).toBe(expectedSpotNearestStation.placeId);
      expect(restoredSpots[0]?.nearestStation?.name).toBe(expectedSpotNearestStation.name);
      expect(restoredSpots[0]?.nearestStation?.latitude).toBe(expectedSpotNearestStation.latitude);
      expect(restoredSpots[0]?.nearestStation?.longitude).toBe(expectedSpotNearestStation.longitude);
      expect(restoredSpots[0]?.nearestStation?.stationType).toBe(expectedSpotNearestStation.stationType);
      expect(restoredSpots[0]?.nearestStation?.spotId).toBe(expectedSpotNearestStation.spotId);
      expect(restoredSpots[0]?.nearestStation?.scheduledDepartureTime).toBe(
        expectedSpotNearestStation.scheduledDepartureTime,
      );
      expect(restoredSpots[0]?.nearestStation?.scheduledDepartureTimes).toEqual(
        expectedSpotNearestStation.scheduledDepartureTimes,
      );

      // dirty が解除されていることを確認
      expect(store.isPlanningDirty(targetDate)).toBe(false);
    });
    it('最寄駅情報追加後、追加前の状態に戻っていること', () => {
      const store = useStoreForPlanning.getState();
      const targetDate = '2026-06-01';

      // 期待される初期最寄駅情報
      const expectedDepartureNearestStation = {
        placeId: 'station-1-add',
        name: 'Station 1 Add',
        latitude: 35.111,
        longitude: 139.111,
        stationType: 'TRAIN' as const,
        transitTime: 6,
        walkingTime: 2,
        spotId: 'departure-add-spot',
        scheduledDepartureTime: '08:45',
        scheduledDepartureTimes: ['08:45', '09:00', '09:15'],
        waitingTime: 3,
      };

      const expectedSpotNearestStation = {
        placeId: 'station-3-add',
        name: 'Station 3 Add',
        latitude: 35.222,
        longitude: 139.222,
        stationType: 'BUS' as const,
        transitTime: 7,
        walkingTime: 3,
        spotId: 'spot-1-add-station',
        scheduledDepartureTime: '10:30',
        scheduledDepartureTimes: ['10:30', '10:45'],
        waitingTime: 2,
      };

      const testSpot = createSpot('spot-1');

      // Arrange: 初期状態をセット
      store.setFields('title', 'テストタイトル');
      store.setFields('startDate', targetDate);
      store.setFields('endDate', '2026-06-02');
      store.setFields('plans', [
        {
          date: targetDate,
          spots: [testSpot],
          departure: createLocation({
            locationType: 'DEPARTURE',
          }),
          destination: createLocation({
            locationType: 'DESTINATION',
          }),
        },
      ]);

      // setPlanningResult で最寄駅情報をスナップショット
      store.setPlanningResult(targetDate, { routes: [] } as any);

      // 最寄駅情報を変更（追加）
      store.setSpots(
        targetDate,
        createSpot('spot-1', {
          nearestStation: {
            placeId: 'station-999-add',
            name: 'Station 999 Add (Changed)',
            latitude: 36.5,
            longitude: 140.5,
            stationType: 'TRAIN' as const,
            transitTime: 25,
          },
        }),
        false,
      );

      // Act: 復元実行
      store.restorePlannedSpots(targetDate);

      // Assert: 復元後の最寄駅情報が元の値と完全に一致することを検証
      const restoredDeparture = store.getDepartureAndDestination(targetDate, TransportNodeType.DEPARTURE);
      const restoredSpots = store.getSpotInfo(targetDate, TransportNodeType.SPOT);

      // 出発地の最寄駅情報を検証（8項目）
      expect(restoredDeparture?.nearestStation).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.placeId).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.name).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.latitude).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.longitude).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.stationType).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.spotId).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.scheduledDepartureTime).toBeUndefined();
      expect(restoredDeparture?.nearestStation?.scheduledDepartureTimes).toBeUndefined();

      // スポットの最寄駅情報を検証
      expect(restoredSpots.length).toBe(1);
      expect(restoredSpots[0]?.nearestStation).toBeUndefined();
      expect(restoredSpots[0]?.nearestStation?.placeId).not.toBe(expectedSpotNearestStation.placeId);
      expect(restoredSpots[0]?.nearestStation?.name).not.toBe(expectedSpotNearestStation.name);
      expect(restoredSpots[0]?.nearestStation?.latitude).not.toBe(expectedSpotNearestStation.latitude);
      expect(restoredSpots[0]?.nearestStation?.longitude).not.toBe(expectedSpotNearestStation.longitude);
      expect(restoredSpots[0]?.nearestStation?.stationType).not.toBe(expectedSpotNearestStation.stationType);
      expect(restoredSpots[0]?.nearestStation?.spotId).not.toBe(expectedSpotNearestStation.spotId);
      expect(restoredSpots[0]?.nearestStation?.transitTime).not.toBe(expectedSpotNearestStation.transitTime);
      expect(restoredSpots[0]?.nearestStation?.scheduledDepartureTime).not.toBe(
        expectedSpotNearestStation.scheduledDepartureTime,
      );
      expect(restoredSpots[0]?.nearestStation?.scheduledDepartureTimes).not.toEqual(
        expectedSpotNearestStation.scheduledDepartureTimes,
      );

      // dirty が解除されていることを確認
      expect(store.isPlanningDirty(targetDate)).toBe(false);
    });
    it('最寄駅情報削除後、削除前の状態に戻っていること', () => {
      const store = useStoreForPlanning.getState();
      const targetDate = '2026-06-01';

      // 期待される初期最寄駅情報
      const expectedDepartureNearestStation = {
        placeId: 'station-1-del',
        name: 'Station 1 Del',
        latitude: 35.555,
        longitude: 139.555,
        stationType: 'BUS' as const,
        transitTime: 4,
        walkingTime: 1,
        spotId: 'departure-del-spot',
        scheduledDepartureTime: '07:30',
        scheduledDepartureTimes: ['07:30', '08:00'],
        waitingTime: 1,
      };

      const expectedSpotNearestStation = {
        placeId: 'station-3-del',
        name: 'Station 3 Del',
        latitude: 35.666,
        longitude: 139.666,
        stationType: 'TRAIN' as const,
        transitTime: 9,
        walkingTime: 2,
        spotId: 'spot-1-del-station',
        scheduledDepartureTime: '11:00',
        scheduledDepartureTimes: ['11:00', '11:30'],
        waitingTime: 5,
      };

      const testSpot = createSpot('spot-1', {
        nearestStation: expectedSpotNearestStation,
      });

      // Arrange: 初期状態をセット
      store.setFields('title', 'テストタイトル');
      store.setFields('startDate', targetDate);
      store.setFields('endDate', '2026-06-02');
      store.setFields('plans', [
        {
          date: targetDate,
          spots: [testSpot],
          departure: createLocation({
            locationType: 'DEPARTURE',
            nearestStation: expectedDepartureNearestStation,
          }),
          destination: createLocation({
            locationType: 'DESTINATION',
            nearestStation: {
              placeId: 'station-2-del',
              name: 'Station 2 Del',
              latitude: 35.777,
              longitude: 139.777,
              stationType: 'BUS' as const,
              transitTime: 2,
              walkingTime: 6,
              spotId: 'destination-del-spot',
            },
          }),
        },
      ]);

      // setPlanningResult で最寄駅情報をスナップショット
      store.setPlanningResult(targetDate, { routes: [] } as any);

      // 最寄駅情報を削除（変更）
      store.setDepartureAndDestination(targetDate, TransportNodeType.DEPARTURE, {
        ...createLocation({
          locationType: 'DEPARTURE',
          nearestStation: undefined, // 最寄駅情報を削除
        }),
      } as ExtendPlanLocationType);

      // Act: 復元実行
      store.restorePlannedSpots(targetDate);

      // Assert: 復元後の最寄駅情報が元の値と完全に一致することを検証
      const restoredDeparture = store.getDepartureAndDestination(targetDate, TransportNodeType.DEPARTURE);
      const restoredSpots = store.getSpotInfo(targetDate, TransportNodeType.SPOT);

      // 出発地の最寄駅情報を検証（8項目）
      expect(restoredDeparture?.nearestStation).toBeDefined();
      expect(restoredDeparture?.nearestStation?.placeId).toBe(expectedDepartureNearestStation.placeId);
      expect(restoredDeparture?.nearestStation?.name).toBe(expectedDepartureNearestStation.name);
      expect(restoredDeparture?.nearestStation?.latitude).toBe(expectedDepartureNearestStation.latitude);
      expect(restoredDeparture?.nearestStation?.longitude).toBe(expectedDepartureNearestStation.longitude);
      expect(restoredDeparture?.nearestStation?.stationType).toBe(expectedDepartureNearestStation.stationType);
      expect(restoredDeparture?.nearestStation?.spotId).toBe(expectedDepartureNearestStation.spotId);
      expect(restoredDeparture?.nearestStation?.scheduledDepartureTime).toBe(
        expectedDepartureNearestStation.scheduledDepartureTime,
      );
      expect(restoredDeparture?.nearestStation?.scheduledDepartureTimes).toEqual(
        expectedDepartureNearestStation.scheduledDepartureTimes,
      );

      // スポットの最寄駅情報を検証
      expect(restoredSpots.length).toBe(1);
      expect(restoredSpots[0]?.nearestStation).toBeDefined();
      expect(restoredSpots[0]?.nearestStation?.placeId).toBe(expectedSpotNearestStation.placeId);
      expect(restoredSpots[0]?.nearestStation?.name).toBe(expectedSpotNearestStation.name);
      expect(restoredSpots[0]?.nearestStation?.latitude).toBe(expectedSpotNearestStation.latitude);
      expect(restoredSpots[0]?.nearestStation?.longitude).toBe(expectedSpotNearestStation.longitude);
      expect(restoredSpots[0]?.nearestStation?.stationType).toBe(expectedSpotNearestStation.stationType);
      expect(restoredSpots[0]?.nearestStation?.spotId).toBe(expectedSpotNearestStation.spotId);
      expect(restoredSpots[0]?.nearestStation?.transitTime).toBe(expectedSpotNearestStation.transitTime);
      expect(restoredSpots[0]?.nearestStation?.scheduledDepartureTime).toBe(
        expectedSpotNearestStation.scheduledDepartureTime,
      );
      expect(restoredSpots[0]?.nearestStation?.scheduledDepartureTimes).toEqual(
        expectedSpotNearestStation.scheduledDepartureTimes,
      );

      // dirty が解除されていることを確認
      expect(store.isPlanningDirty(targetDate)).toBe(false);
    });
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
            transportMethodId: 2,
            transportMethod: 'DRIVING',
          }),
        ],
        departure: {} as ExtendPlanLocationType,
        destination: {} as ExtendPlanLocationType,
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
            transportMethodId: 1,
            transportMethod: 'WALKING',
          }),
        ],
        departure: {} as ExtendPlanLocationType,
        destination: {} as ExtendPlanLocationType,
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
    expect(updatedSpot.transportMethodId).toBe(1);
    expect(updatedSpot.transportMethod).toBe('WALKING');
    expect(updatedSpot.alternateRoutes?.length).toBe(1);
    expect(store.isPlanningDirty(date)).toBe(false);
    expect(store.getDirtyPlanningDates()).toEqual([]);
  });
});
