import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { hasDirtySpotChange, hasDirtyDepartureAndDestinationChange } from '@/lib/planning';
import { DEFAULT_DEPARTURE_AND_DESTINATION } from '@/data/constants';
import { ExtendPlanLocationType, ExtendSpotType } from '@/types/plan';

describe('planning.ts: dirty判定', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dirty対象項目の変更テスト', () => {
    const targetSpot: ExtendSpotType = {
      id: 'spot-1',
      spotId: 'spot-1',
      name: 'スポット1',
      latitude: 35.6895,
      longitude: 139.6917,
      stayStart: '10:00',
      stayEnd: '11:00',
      stayDuration: 60,
      rating: 4.5,
      memo: '',
      transportMethodId: 1,
      transportMethod: 'WALKING',
      travelTime: 15,
      nearestStation: {
        name: '新宿駅',
        stationType: 'TRAIN',
        transitTime: 10,
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
        placeId: 'spot-station',
        memo: '',
      },
      order: 1,
    };

    const targetDeparture: ExtendPlanLocationType = {
      ...DEFAULT_DEPARTURE_AND_DESTINATION,
      nearestStation: {
        name: '新宿駅',
        stationType: 'TRAIN',
        transitTime: 12,
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        placeId: 'dep-station',
        memo: '',
      },
    };

    it('スポットの変更対象の項目が変わっている場合はフラグがon', () => {
      const changedSpot: ExtendSpotType = { ...targetSpot, stayStart: '10:30' };
      expect(hasDirtySpotChange(targetSpot, changedSpot)).toBe(true); // 期待値に応じて変更
    });

    it('スポットの変更対象外の項目が変わっている場合はフラグがoff', () => {
      const changedSpot: ExtendSpotType = { ...targetSpot, memo: '新しいメモ' };
      expect(hasDirtySpotChange(targetSpot, changedSpot)).toBe(false); // 期待値に応じて変更
    });

    it('スポットの変更対象(最寄駅)の項目が変わっている場合はフラグがon', () => {
      const changedSpot: ExtendSpotType = {
        ...targetSpot,
        nearestStation: {
          ...targetSpot.nearestStation,
          name: '新宿駅',
          stationType: 'TRAIN',
          transitTime: 12, // 変更
          walkingTime: 10,
          latitude: 35.6895,
          longitude: 139.7004,
          placeId: 'spot-station',
          memo: '',
        },
      };
      expect(hasDirtySpotChange(targetSpot, changedSpot)).toBe(true); // 期待値に応じて変更
    });

    it('スポットの変更対象外(最寄駅)の項目が変わっている場合はフラグがoff', () => {
      const changedSpot: ExtendSpotType = {
        ...targetSpot,
        nearestStation: {
          ...targetSpot.nearestStation,
          name: '新宿駅',
          stationType: 'TRAIN',
          transitTime: 10,
          walkingTime: 10,
          latitude: 35.6895,
          longitude: 139.7004,
          placeId: 'spot-station',
          memo: 'new memo', // 変更
        },
      };
      expect(hasDirtySpotChange(targetSpot, changedSpot)).toBe(false); // 期待値に応じて変更
    });

    it('スポットの(最寄駅)の有無が変わっている場合はフラグがon(あり→なし)', () => {
      const changedSpot: ExtendSpotType = {
        ...targetSpot,
        nearestStation: undefined, // 変更
      };
      expect(hasDirtySpotChange(targetSpot, changedSpot)).toBe(true); // 期待値に応じて変更
    });

    it('スポットの(最寄駅)の有無が変わっている場合はフラグがon(なし→あり)', () => {
      const changedSpot: ExtendSpotType = {
        ...targetSpot,
        nearestStation: undefined, // 変更
      };
      expect(hasDirtySpotChange(changedSpot, targetSpot)).toBe(true); // 期待値に応じて変更
    });

    it('出発地/目的地の変更対象の項目が変わっている場合はフラグがon', () => {
      const changedDeparture: ExtendPlanLocationType = { ...targetDeparture, latitude: 35.682 };
      expect(hasDirtyDepartureAndDestinationChange(targetDeparture, changedDeparture)).toBe(true); // 期待値に応じて変更
    });

    it('出発地/目的地の変更対象外の項目が変わっている場合はフラグがoff', () => {
      const changedDeparture: ExtendPlanLocationType = {
        ...targetDeparture,
        nearestStation: {
          ...targetDeparture.nearestStation,
          name: '新宿駅',
          walkingTime: targetDeparture.nearestStation?.walkingTime ?? 10,
          placeId: targetDeparture.nearestStation?.placeId ?? 'dep-station',
          stationType: targetDeparture.nearestStation?.stationType ?? 'TRAIN',
          transitTime: targetDeparture.nearestStation?.transitTime ?? 12,
          latitude: targetDeparture.nearestStation?.latitude ?? 35.681236,
          longitude: targetDeparture.nearestStation?.longitude ?? 139.767125,
          memo: 'new memo', //変更
        },
      };
      expect(hasDirtyDepartureAndDestinationChange(targetDeparture, changedDeparture)).toBe(false); // 期待値に応じて変更
    });

    it('出発地/目的地の最寄駅の有無が変わっている場合はフラグがon(あり→なし)', () => {
      const changedDeparture: ExtendPlanLocationType = {
        ...targetDeparture,
        nearestStation: undefined, // 変更
      };
      expect(hasDirtyDepartureAndDestinationChange(targetDeparture, changedDeparture)).toBe(true); // 期待値に応じて変更
    });

    it('出発地/目的地の最寄駅の有無が変わっている場合はフラグがon(なし→あり)', () => {
      const changedDeparture: ExtendPlanLocationType = {
        ...targetDeparture,
        nearestStation: undefined, // 変更
      };
      expect(hasDirtyDepartureAndDestinationChange(changedDeparture, targetDeparture)).toBe(true); // 期待値に応じて変更
    });
  });
});
