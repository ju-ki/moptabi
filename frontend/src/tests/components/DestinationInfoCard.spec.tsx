import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DestinationInfoCard } from '@/components/DestinationInfoCard';
import type { DepartureAndDestinationType } from '@/models/planLocation';

function createDestination(overrides: Partial<DepartureAndDestinationType> = {}): DepartureAndDestinationType {
  return {
    name: '羽田空港',
    latitude: 35.5494,
    longitude: 139.7798,
    address: '東京都大田区羽田空港',
    label: null,
    isDefault: false,
    locationType: 'DESTINATION',
    usageCount: null,
    planId: null,
    planName: null,
    userLocationId: null,
    planLocationId: null,
    transports: {
      transportMethod: 4,
      name: 'TRANSIT',
      fromType: 'SPOT',
      toType: 'DESTINATION',
      travelTime: '00:20',
      cost: 0,
    },
    time: '18:00',
    nearestStation: {
      placeId: 'station-d-1',
      stationType: 'OTHER',
      name: '不明な乗り場',
      walkingTime: 4,
      transitTime: 9,
      transitMemo: '北口\n階段を利用',
    },
    ...overrides,
  };
}

describe('DestinationInfoCard', () => {
  it('stationTypeがOTHERの場合は?アイコンを表示する', () => {
    render(<DestinationInfoCard destination={createDestination()} />);

    expect(screen.getByTestId('nearest-station-type-icon')).toHaveTextContent('?');
  });

  it('目的地カードでは最寄駅の発車時刻は表示しない', () => {
    render(
      <DestinationInfoCard
        destination={createDestination({
          nearestStation: {
            placeId: 'station-d-2',
            stationType: 'TRAIN',
            name: '天王洲アイル駅',
            walkingTime: 6,
            transitTime: 12,
            scheduledDepartureTime: '16:20',
          },
        })}
      />,
    );

    expect(screen.queryByTestId('nearest-station-departure-time')).not.toBeInTheDocument();
  });

  it('目的地カードでは最寄駅のメモは表示しない', () => {
    render(<DestinationInfoCard destination={createDestination()} />);

    expect(screen.queryByTestId('nearest-station-memo')).not.toBeInTheDocument();
  });
});
