import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RouteSummaryNearestStation from '@/components/travel-plan/nearestStation/RouteSummaryNearestStation';
import { StationType } from '@/types/nearestStation';
import { ExtendNearestStationType } from '@/types/plan';

describe('RouteSummaryNearestStation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('出発地から最初のスポットまでの最寄駅経由のルート概要を表示する', () => {
    const originNearestStation: ExtendNearestStationType = {
      placeId: 'origin-station',
      name: '出発駅',
      latitude: 35.6895,
      longitude: 139.6917,
      stationType: 'TRAIN' as StationType,
      walkingTime: 5,
      transitTime: 15,
      memo: '乗換なし',
      waitingTime: 3,
      scheduledDepartureTime: '08:00',
    };

    const destinationNearestStation: ExtendNearestStationType = {
      name: '目的地駅',
      placeId: 'destination-station',
      latitude: 35.6895,
      longitude: 139.6917,
      stationType: 'TRAIN' as StationType,
      walkingTime: 4,
      transitTime: 12,
      scheduledDepartureTime: '08:20',
      memo: '乗換あり',
      waitingTime: 2,
    };

    const activeDepartureTime = '08:20';

    render(
      <RouteSummaryNearestStation
        originNearestStation={originNearestStation}
        destinationNearestStation={destinationNearestStation}
        activeDepartureTime={activeDepartureTime}
      />,
    );

    expect(screen.getByText(`徒歩 ${originNearestStation.walkingTime}分`)).toBeInTheDocument();
    expect(screen.getByText(`電車/バス ${originNearestStation.transitTime}分`)).toBeInTheDocument();
    expect(screen.getByTestId('departure-selected-time')).toHaveTextContent(`(発車: ${activeDepartureTime})`);
    expect(screen.getByText(`徒歩 ${destinationNearestStation.walkingTime}分`)).toBeInTheDocument();
    expect(screen.getByText(`${originNearestStation.memo}`)).toBeInTheDocument();
  });
  it('スポット間の最寄駅経由のルート概要を表示する', () => {
    const originNearestStation: ExtendNearestStationType = {
      placeId: 'origin-station',
      name: '出発駅',
      latitude: 35.6895,
      longitude: 139.6917,
      stationType: 'TRAIN' as StationType,
      walkingTime: 5,
      transitTime: 15,
      memo: '乗換なし',
      waitingTime: 3,
      scheduledDepartureTime: '08:00',
    };

    const destinationNearestStation: ExtendNearestStationType = {
      name: '次スポット',
      placeId: 'destination-station',
      latitude: 35.6895,
      longitude: 139.6917,
      stationType: 'TRAIN' as StationType,
      walkingTime: 4,
      transitTime: 12,
      scheduledDepartureTime: '08:20',
      memo: '乗換あり',
      waitingTime: 2,
    };

    const activeDepartureTime = '08:20';

    render(
      <RouteSummaryNearestStation
        originNearestStation={originNearestStation}
        destinationNearestStation={destinationNearestStation}
        activeDepartureTime={activeDepartureTime}
      />,
    );

    expect(screen.getByText(`徒歩 ${originNearestStation.walkingTime}分`)).toBeInTheDocument();
    expect(screen.getByText(`電車/バス ${originNearestStation.transitTime}分`)).toBeInTheDocument();
    expect(screen.getByTestId('departure-selected-time')).toHaveTextContent(`(発車: ${activeDepartureTime})`);
    expect(screen.getByText(`徒歩 ${destinationNearestStation.walkingTime}分`)).toBeInTheDocument();
    expect(screen.getByText(`${originNearestStation.memo}`)).toBeInTheDocument();
  });
  it('最後のスポットから目的地までの最寄駅経由のルート概要を表示する', () => {
    const originNearestStation: ExtendNearestStationType = {
      placeId: 'origin-station',
      name: '出発駅',
      latitude: 35.6895,
      longitude: 139.6917,
      stationType: 'TRAIN' as StationType,
      walkingTime: 5,
      transitTime: 15,
      memo: '乗換なし',
      waitingTime: 3,
      scheduledDepartureTime: '08:00',
    };

    const destinationNearestStation: ExtendNearestStationType = {
      name: '目的地駅',
      placeId: 'destination-station',
      latitude: 35.6895,
      longitude: 139.6917,
      stationType: 'TRAIN' as StationType,
      walkingTime: 4,
      transitTime: 12,
      scheduledDepartureTime: '08:20',
      memo: '乗換あり',
      waitingTime: 2,
    };

    const activeDepartureTime = '08:20';

    render(
      <RouteSummaryNearestStation
        originNearestStation={originNearestStation}
        destinationNearestStation={destinationNearestStation}
        activeDepartureTime={activeDepartureTime}
      />,
    );

    expect(screen.getByText(`徒歩 ${originNearestStation.walkingTime}分`)).toBeInTheDocument();
    expect(screen.getByText(`電車/バス ${originNearestStation.transitTime}分`)).toBeInTheDocument();
    expect(screen.getByTestId('departure-selected-time')).toHaveTextContent(`(発車: ${activeDepartureTime})`);
    expect(screen.getByText(`徒歩 ${destinationNearestStation.walkingTime}分`)).toBeInTheDocument();
    expect(screen.getByText(`${originNearestStation.memo}`)).toBeInTheDocument();
  });
});
