import { describe, expect, it } from 'vitest';
import { PlanLocationCandidateItemType } from '@shared/user/types';

import { buildDepartureFromCandidate, buildDestinationFromCandidate } from '@/lib/plan-location';
import {
  DEFAULT_ARRIVAL_TIME,
  DEFAULT_DEPARTURE_AND_DESTINATION,
  DEFAULT_DEPARTURE_TIME,
} from '@/data/constants';
import { calculateDistance } from '@/data/mockNearestStation';
import { TransportNodeType } from '@/types/plan';

const baseCandidate: PlanLocationCandidateItemType = {
  name: '自宅',
  latitude: 35.6895,
  longitude: 139.6917,
  label: 'HOME',
  isDefault: true,
  locationType: 'DEPARTURE',
  usageCount: 3,
  planId: null,
  planName: null,
  userLocationId: 10,
  planLocationId: null,
  nearestStation: null,
};

const candidateWithStation: PlanLocationCandidateItemType = {
  ...baseCandidate,
  nearestStation: {
    placeId: 'station-place-id',
    stationType: 'TRAIN',
    latitude: 35.6905,
    longitude: 139.7004,
    name: '新宿駅',
    transitTime: 0,
    walkingTime: 8,
  },
};

describe('buildDepartureFromCandidate', () => {
  it('最寄駅付きのお気に入りから、最寄駅が選択済みの出発地を作ること', () => {
    const departure = buildDepartureFromCandidate(candidateWithStation);

    expect(departure).toEqual({
      name: '自宅',
      latitude: 35.6895,
      longitude: 139.6917,
      planId: undefined,
      locationType: TransportNodeType.DEPARTURE,
      time: DEFAULT_DEPARTURE_TIME,
      travelTime: 0,
      userLocationId: 10,
      transportMethod: 'TRANSIT',
      transportMethodId: 4,
      isSetSelectedNearestStation: true,
      nearestStation: {
        placeId: 'station-place-id',
        stationType: 'TRAIN',
        latitude: 35.6905,
        longitude: 139.7004,
        name: '新宿駅',
        walkingTime: 8,
        distance: calculateDistance(35.6895, 139.6917, 35.6905, 139.7004),
        transitTime: 0,
      },
      alternateRoutes: [],
    });
  });

  it('最寄駅のないお気に入りでは、移動手段がDEFAULTで最寄駅なしの出発地を作ること', () => {
    const departure = buildDepartureFromCandidate(baseCandidate);

    expect(departure.userLocationId).toBe(10);
    expect(departure.transportMethod).toBe('DEFAULT');
    expect(departure.transportMethodId).toBe(0);
    expect(departure.isSetSelectedNearestStation).toBe(false);
    expect(departure.nearestStation).toBeUndefined();
  });

  it('候補がない場合は既定の地点で出発地を作ること', () => {
    const departure = buildDepartureFromCandidate(undefined);

    expect(departure.name).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.name);
    expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
    expect(departure.longitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.longitude);
    expect(departure.locationType).toBe(TransportNodeType.DEPARTURE);
    expect(departure.time).toBe(DEFAULT_DEPARTURE_TIME);
    expect(departure.transportMethod).toBe('DEFAULT');
    expect(departure.userLocationId).toBeUndefined();
    expect(departure.nearestStation).toBeUndefined();
  });
});

describe('buildDestinationFromCandidate', () => {
  it('お気に入りから目的地を作り、最寄駅は反映しないこと', () => {
    const destination = buildDestinationFromCandidate(candidateWithStation);

    expect(destination).toEqual({
      name: '自宅',
      latitude: 35.6895,
      longitude: 139.6917,
      planId: undefined,
      locationType: TransportNodeType.DESTINATION,
      time: DEFAULT_ARRIVAL_TIME,
      travelTime: 0,
      userLocationId: 10,
      transportMethod: 'DEFAULT',
      transportMethodId: 0,
      alternateRoutes: [],
    });
  });

  it('候補がない場合は既定の地点で目的地を作ること', () => {
    const destination = buildDestinationFromCandidate(undefined);

    expect(destination.name).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.name);
    expect(destination.locationType).toBe(TransportNodeType.DESTINATION);
    expect(destination.time).toBe(DEFAULT_ARRIVAL_TIME);
    expect(destination.userLocationId).toBeUndefined();
  });
});
