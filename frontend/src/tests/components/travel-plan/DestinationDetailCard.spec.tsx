import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DestinationDetailCard from '@/components/travel-plan/DestinationDetailCard';
import { DEFAULT_ARRIVAL_TIME, DEFAULT_DEPARTURE_TIME } from '@/data/constants';

const mockGetDepartureAndDestination = vi.fn();
const mockGetSpotInfo = vi.fn();
const mockGetPlanningResult = vi.fn();
const mockSwitchAlternativeRoute = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getDepartureAndDestination: mockGetDepartureAndDestination,
    getSpotInfo: mockGetSpotInfo,
    getPlanningResult: mockGetPlanningResult,
    switchAlternativeRoute: mockSwitchAlternativeRoute,
  }),
}));

type AlternativeTransport = {
  transportMethodId: number;
  transportMethod: 'WALKING' | 'BICYCLING' | 'TRANSIT' | 'DRIVING';
  durationText: string;
};

function createDestination(overrides?: Partial<Record<string, unknown>>) {
  return {
    name: '大阪駅',
    address: '大阪府大阪市北区梅田3-1-1',
    time: '18:00',
    transports: {
      transportMethod: 4,
      travelTime: '15分',
    },
    nearestStation: {
      name: '梅田駅',
      walkingTime: 6,
    },
    alternativeTransports: [
      { transportMethodId: 1, transportMethod: 'WALKING', durationText: '30分' },
      { transportMethodId: 2, transportMethod: 'BICYCLING', durationText: '20分' },
    ] as AlternativeTransport[],
    ...overrides,
  };
}

function createPreviousSpot(overrides?: Partial<Record<string, unknown>>) {
  return {
    nearestStation: {
      name: '本町駅',
      walkingTime: 5,
      transitTime: 10,
      scheduledDepartureTime: '17:40',
    },
    ...overrides,
  };
}

describe('DestinationDetailCard', () => {
  const date = '2026-05-06';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartureAndDestination.mockReturnValue(createDestination());
    mockGetSpotInfo.mockReturnValue([createPreviousSpot()]);
    mockGetPlanningResult.mockReturnValue({
      routes: [
        {
          id: 'route-spot-destination',
          fromType: 'SPOT',
          toType: 'DESTINATION',
          transportMethod: 'TRANSIT',
        },
      ],
      totalDistance: 1000,
      totalDuration: 20,
      departureTime: DEFAULT_DEPARTURE_TIME,
      arrivalTime: DEFAULT_ARRIVAL_TIME,
      isOverTime: false,
      updatedSpots: [],
      updatedDeparture: createDestination(), // 目的地のテストなので仮置き
      updatedDestination: createDestination(),
    });
  });

  it('移動手段が複数ある場合の表記', () => {
    render(<DestinationDetailCard date={date} index={1} />);

    expect(screen.getByRole('button', { name: /徒歩 \(30分\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /自転車 \(20分\)/ })).toBeInTheDocument();
  });

  it('最寄駅経由でない場合は区間分割が表示されない', () => {
    mockGetDepartureAndDestination.mockReturnValue(
      createDestination({
        transports: {
          transportMethod: 1,
          travelTime: '30分',
        },
      }),
    );

    render(<DestinationDetailCard date={date} index={1} />);

    expect(screen.queryByText(/電車\/バス/)).not.toBeInTheDocument();
  });

  it('移動手段を変えても到着時刻が変わらない', () => {
    render(<DestinationDetailCard date={date} index={1} />);

    const before = screen.getByText('到着時刻: 18:00');
    fireEvent.click(screen.getByRole('button', { name: /徒歩 \(30分\)/ }));
    const after = screen.getByText('到着時刻: 18:00');

    expect(before).toBe(after);
  });

  it('移動手段変更後、DB登録用Payloadに反映される', () => {
    render(<DestinationDetailCard date={date} index={1} />);

    fireEvent.click(screen.getByRole('button', { name: /自転車 \(20分\)/ }));

    expect(mockSwitchAlternativeRoute).toHaveBeenCalledWith(date, 'route-spot-destination', 2);
  });

  describe('複数日対応', () => {
    it('複数日プランで日付ごとに目的地情報が正しく取得される', () => {
      const destination = createDestination({
        name: '大阪駅',
        time: '18:00',
      });

      mockGetDepartureAndDestination.mockReturnValue(destination);
      mockGetSpotInfo.mockReturnValue([createPreviousSpot()]);
      mockGetPlanningResult.mockReturnValue({
        routes: [
          {
            id: 'route-spot-destination',
            fromType: 'SPOT',
            toType: 'DESTINATION',
            transportMethod: 'TRANSIT',
          },
        ],
        totalDistance: 1000,
        totalDuration: 20,
        departureTime: DEFAULT_DEPARTURE_TIME,
        arrivalTime: DEFAULT_ARRIVAL_TIME,
        isOverTime: false,
        updatedSpots: [],
        updatedDeparture: createDestination(), // 目的地のテストなので仮置き
        updatedDestination: createDestination(),
      });

      render(<DestinationDetailCard date="2025-12-20" index={1} />);

      expect(screen.getByText(/大阪駅/)).toBeInTheDocument();
      expect(screen.getByText('到着時刻: 18:00')).toBeInTheDocument();
    });

    it('複数日プランで最寄駅が設定されている場合に表示される', () => {
      const destination = createDestination({
        name: '大阪駅',
        nearestStation: {
          name: '梅田駅',
          walkingTime: 6,
        },
      });

      mockGetDepartureAndDestination.mockReturnValue(destination);
      mockGetSpotInfo.mockReturnValue([
        createPreviousSpot({
          nearestStation: {
            name: '本町駅',
            walkingTime: 5,
            transitTime: 10,
            scheduledDepartureTime: '17:40',
          },
        }),
      ]);
      mockGetPlanningResult.mockReturnValue({
        routes: [
          {
            id: 'route-spot-destination',
            fromType: 'SPOT',
            toType: 'DESTINATION',
            transportMethod: 'TRANSIT',
          },
        ],
        totalDistance: 1000,
        totalDuration: 20,
        departureTime: DEFAULT_DEPARTURE_TIME,
        arrivalTime: DEFAULT_ARRIVAL_TIME,
        isOverTime: false,
        updatedSpots: [],
        updatedDeparture: createDestination(), // 目的地のテストなので仮置き
        updatedDestination: createDestination(),
      });

      render(<DestinationDetailCard date="2025-12-20" index={1} />);

      const stationElements = screen.queryAllByText(/梅田駅/);
      expect(stationElements.length).toBeGreaterThan(0);
    });

    it('複数日で異なる移動手段候補が表示される', () => {
      const destination = createDestination({
        alternativeTransports: [
          { transportMethodId: 1, transportMethod: 'WALKING', durationText: '30分' },
          { transportMethodId: 2, transportMethod: 'BICYCLING', durationText: '20分' },
        ],
      });

      mockGetDepartureAndDestination.mockReturnValue(destination);
      mockGetSpotInfo.mockReturnValue([createPreviousSpot()]);
      mockGetPlanningResult.mockReturnValue({
        routes: [
          {
            id: 'route-spot-destination',
            fromType: 'SPOT',
            toType: 'DESTINATION',
            transportMethod: 'TRANSIT',
          },
        ],
        totalDistance: 1000,
        totalDuration: 20,
        departureTime: DEFAULT_DEPARTURE_TIME,
        arrivalTime: DEFAULT_ARRIVAL_TIME,
        isOverTime: false,
        updatedSpots: [],
        updatedDeparture: createDestination(), // 目的地のテストなので仮置き
        updatedDestination: createDestination(),
      });

      render(<DestinationDetailCard date="2025-12-21" index={1} />);

      expect(screen.getByRole('button', { name: /徒歩 \(30分\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /自転車 \(20分\)/ })).toBeInTheDocument();
    });
  });
});
