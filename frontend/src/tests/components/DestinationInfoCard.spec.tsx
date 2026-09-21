import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DestinationInfoCard } from '@/components/DestinationInfoCard';
import { ExtendPlanLocationType } from '@/types/plan';

function createDestination(overrides: Partial<ExtendPlanLocationType> = {}): ExtendPlanLocationType {
  return {
    name: '羽田空港',
    latitude: 35.5494,
    longitude: 139.7798,
    locationType: 'DESTINATION',
    userLocationId: 1,
    transportMethodId: 4,
    transportMethod: 'TRANSIT',
    travelTime: 20,
    time: '18:00',
    nearestStation: {
      placeId: 'station-d-1',
      stationType: 'OTHER',
      name: '不明な乗り場',
      walkingTime: 4,
      transitTime: 0,
      memo: '',
      latitude: 35.5494,
      longitude: 139.7798,
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
            transitTime: 0,
            scheduledDepartureTime: '',
            latitude: 35.5494,
            longitude: 139.7798,
            memo: '',
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
