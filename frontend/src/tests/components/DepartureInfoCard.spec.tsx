import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DepartureInfoCard } from '@/components/DepartureInfoCard';
import { ExtendPlanLocationType } from '@/types/plan';

function createDeparture(overrides: Partial<ExtendPlanLocationType> = {}): ExtendPlanLocationType {
  return {
    name: '東京駅',
    latitude: 35.6812,
    longitude: 139.7671,
    locationType: 'DEPARTURE',
    transportMethodId: 4,
    transportMethod: 'TRANSIT',
    travelTime: 40,
    time: '09:00',
    nearestStation: {
      placeId: 'station-1',
      stationType: 'OTHER',
      name: '不明な乗り場',
      walkingTime: 6,
      transitTime: 11,
      memo: 'A出口\n右へ進む',
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
            memo: '',
            latitude: 35.6812,
            longitude: 139.7671,
          },
        })}
      />,
    );

    expect(screen.queryByTestId('nearest-station-memo')).not.toBeInTheDocument();
  });

  it.each([
    [12, '待ち 12分'],
    [0, '待ち 0分'],
  ])('待ち時間が %i 分のとき「%s」を表示する（No.375）', (waitingTime, expected) => {
    const departure = createDeparture();
    render(
      <DepartureInfoCard departure={{ ...departure, nearestStation: { ...departure.nearestStation!, waitingTime } }} />,
    );

    expect(screen.getByTestId('nearest-station-waiting-time')).toHaveTextContent(expected);
  });

  it('待ち時間が未設定のときは表示しない（No.375）', () => {
    render(<DepartureInfoCard departure={createDeparture()} />);

    expect(screen.queryByTestId('nearest-station-waiting-time')).not.toBeInTheDocument();
  });
});
