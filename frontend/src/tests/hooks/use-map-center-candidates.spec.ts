import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useMapCenterCandidates } from '@/hooks/spot-search/use-map-center-candidates';
import { useStoreForPlanning } from '@/lib/plan';
import { ExtendPlanLocationType, ExtendSpotType, TravelPlanType } from '@/types/plan';

/**
 * 地図で探すの中心の候補（No.341）を検証する
 */

const DAY1 = '2026-10-17';
const DAY2 = '2026-10-18';

const location = (name: string, lat: number, lng: number): ExtendPlanLocationType =>
  ({ name, latitude: lat, longitude: lng, time: '09:00', alternateRoutes: [] }) as unknown as ExtendPlanLocationType;

const spot = (id: string, name: string, lat: number, lng: number): ExtendSpotType =>
  ({
    id,
    spotId: id,
    name,
    latitude: lat,
    longitude: lng,
    stayStart: '10:00',
    stayEnd: '11:00',
    stayDuration: 60,
    rating: 4,
    transportMethodId: 0,
    transportMethod: 'DEFAULT',
    travelTime: 0,
    order: 0,
  }) as ExtendSpotType;

const plan = (date: string, overrides: Partial<TravelPlanType> = {}): TravelPlanType => ({
  date,
  spots: [],
  departure: location('京都駅', 34.9858, 135.7588),
  destination: location('京都タワー', 34.9875, 135.7593),
  ...overrides,
});

describe('useMapCenterCandidates', () => {
  beforeEach(() => {
    useStoreForPlanning.setState({ plans: [] });
  });

  it('出発地・目的地・その日のスポット（番号付き）・他の日のスポット（日付付き）の順に並ぶこと', () => {
    useStoreForPlanning.setState({
      plans: [
        plan(DAY1, {
          spots: [spot('kiyomizu', '清水寺', 34.9949, 135.785), spot('inari', '伏見稲荷大社', 34.9671, 135.7727)],
        }),
        plan(DAY2, { spots: [spot('arashiyama', '嵐山', 35.0094, 135.6668)] }),
      ],
    });

    const { result } = renderHook(() => useMapCenterCandidates(DAY1));

    expect(result.current.candidates.map((c) => c.label)).toEqual([
      '京都駅 (出発地)',
      '京都タワー (目的地)',
      '① 清水寺',
      '② 伏見稲荷大社',
      '10/18 嵐山',
    ]);
    expect(result.current.candidates[2]).toMatchObject({ lat: 34.9949, lng: 135.785 });
  });

  it('出発地・目的地のスポットID（departure_日付 / destination_日付）はスポットとして数えないこと', () => {
    useStoreForPlanning.setState({
      plans: [
        plan(DAY1, {
          spots: [spot(`departure_${DAY1}`, '出発地', 34.9858, 135.7588), spot('kiyomizu', '清水寺', 34.99, 135.78)],
        }),
      ],
    });

    const { result } = renderHook(() => useMapCenterCandidates(DAY1));

    expect(result.current.candidates.map((c) => c.label)).toEqual([
      '京都駅 (出発地)',
      '京都タワー (目的地)',
      '① 清水寺',
    ]);
  });

  it('初期中心は目的地を優先すること', () => {
    useStoreForPlanning.setState({ plans: [plan(DAY1)] });

    const { result } = renderHook(() => useMapCenterCandidates(DAY1));

    expect(result.current.initialCenter).toMatchObject({ label: '京都タワー (目的地)', lat: 34.9875 });
  });

  it('目的地がなければ出発地を初期中心にすること', () => {
    useStoreForPlanning.setState({ plans: [plan(DAY1, { destination: location('', 0, 0) })] });

    const { result } = renderHook(() => useMapCenterCandidates(DAY1));

    expect(result.current.initialCenter).toMatchObject({ label: '京都駅 (出発地)' });
  });

  it('出発地・目的地がどちらもなければ東京駅を初期中心にし、候補には含めないこと', () => {
    useStoreForPlanning.setState({
      plans: [plan(DAY1, { departure: location('', 0, 0), destination: location('', 0, 0) })],
    });

    const { result } = renderHook(() => useMapCenterCandidates(DAY1));

    expect(result.current.initialCenter).toMatchObject({ label: '東京駅', lat: 35.6813, lng: 139.7671 });
    expect(result.current.candidates).toEqual([]);
  });
});
