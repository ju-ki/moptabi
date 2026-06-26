import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DepartureInfoCard } from '@/components/DepartureInfoCard';
import type { DepartureAndDestinationType } from '@/models/planLocation';

function createDeparture(overrides: Partial<DepartureAndDestinationType> = {}): DepartureAndDestinationType {
  return {
    name: '東京駅',
    latitude: 35.6812,
    longitude: 139.7671,
    address: '東京都千代田区丸の内1-9-1',
    label: null,
    isDefault: false,
    locationType: 'DEPARTURE',
    usageCount: null,
    planId: null,
    planName: null,
    userLocationId: null,
    planLocationId: null,
    transports: {
      transportMethod: 4,
      name: 'TRANSIT',
      fromType: 'DEPARTURE',
      toType: 'SPOT',
      travelTime: '00:40',
      cost: 0,
    },
    time: '09:00',
    nearestStation: {
      placeId: 'station-1',
      stationType: 'OTHER',
      name: '不明な乗り場',
      walkingTime: 6,
      transitTime: 11,
      transitMemo: 'A出口\n右へ進む',
      latitude: 35.6812,
      longitude: 139.7671,
    },
    ...overrides,
  };
}

describe('DepartureInfoCard', () => {
  it('stationTypeがOTHERの場合は?アイコンを表示する', () => {
    render(<DepartureInfoCard departure={createDeparture()} />);

    expect(screen.getByTestId('nearest-station-type-icon')).toHaveTextContent('?');
  });

  it('発車時間がない場合は--:--を表示する', () => {
    render(
      <DepartureInfoCard
        departure={createDeparture({
          nearestStation: {
            placeId: 'station-2',
            stationType: 'TRAIN',
            name: '赤羽橋駅',
            walkingTime: 5,
            transitTime: 8,
            latitude: 35.6812,
            longitude: 139.7671,
          },
        })}
      />,
    );

    expect(screen.getByTestId('nearest-station-departure-time')).toHaveTextContent('--:--');
  });

  it('最寄駅メモは改行を維持して表示する', () => {
    render(<DepartureInfoCard departure={createDeparture()} />);

    const memo = screen.getByTestId('nearest-station-memo');
    expect(memo).toHaveClass('whitespace-pre-wrap');
    expect(memo).toHaveTextContent(/A出口\s+右へ進む/);
  });

  it('最寄駅メモが空文字の場合は表示しない', () => {
    render(
      <DepartureInfoCard
        departure={createDeparture({
          nearestStation: {
            placeId: 'station-3',
            stationType: 'BUS',
            name: '都営バス停',
            walkingTime: 3,
            transitTime: 7,
            transitMemo: '',
            latitude: 35.6812,
            longitude: 139.7671,
          },
        })}
      />,
    );

    expect(screen.queryByTestId('nearest-station-memo')).not.toBeInTheDocument();
  });
});
