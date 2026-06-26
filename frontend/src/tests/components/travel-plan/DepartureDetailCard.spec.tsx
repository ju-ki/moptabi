import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DepartureDetailCard from '@/components/travel-plan/DepartureDetailCard';
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

function createDeparture(overrides?: Partial<Record<string, unknown>>) {
  return {
    name: '新宿駅',
    address: '東京都新宿区新宿3-38-1',
    time: DEFAULT_DEPARTURE_TIME,
    transports: {
      transportMethod: 4,
      travelTime: '10分',
    },
    nearestStation: {
      name: '新宿三丁目駅',
      walkingTime: 5,
    },
    alternativeTransports: [
      { transportMethodId: 1, transportMethod: 'WALKING', durationText: '20分' },
      { transportMethodId: 2, transportMethod: 'BICYCLING', durationText: '15分' },
    ] as AlternativeTransport[],
    ...overrides,
  };
}

function createNextSpot(overrides?: Partial<Record<string, unknown>>) {
  return {
    nearestStation: {
      name: '東京駅',
      walkingTime: 4,
      transitTime: 12,
      scheduledDepartureTime: '08:20',
    },
    ...overrides,
  };
}

describe('DepartureDetailCard', () => {
  const date = '2026-05-06';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartureAndDestination.mockReturnValue(createDeparture());
    mockGetSpotInfo.mockReturnValue([createNextSpot()]);
    mockGetPlanningResult.mockReturnValue({
      routes: [
        {
          id: 'route-departure-spot',
          fromType: 'DEPARTURE',
          toType: 'SPOT',
          transportMethod: 'TRANSIT',
        },
      ],
      totalDistance: 1000,
      totalDuration: 20,
      departureTime: DEFAULT_DEPARTURE_TIME,
      arrivalTime: DEFAULT_ARRIVAL_TIME,
      isOverTime: false,
      updatedSpots: [],
      updatedDeparture: createDeparture(),
      updatedDestination: createDeparture(), // 出発地のテストなので仮置き
    });
  });

  it('移動手段が複数ある場合の表記', () => {
    render(<DepartureDetailCard date={date} index={0} />);

    expect(screen.getByRole('button', { name: /徒歩 \(20分\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /自転車 \(15分\)/ })).toBeInTheDocument();
  });

  it('最寄駅経由でない場合は区間分割が表示されない', () => {
    mockGetDepartureAndDestination.mockReturnValue(
      createDeparture({
        transports: {
          transportMethod: 1,
          travelTime: '20分',
        },
      }),
    );

    render(<DepartureDetailCard date={date} index={0} />);

    expect(screen.queryByText(/電車\/バス/)).not.toBeInTheDocument();
  });

  it('移動手段を変えても出発時刻が変わらない', () => {
    render(<DepartureDetailCard date={date} index={0} />);

    const before = screen.getByText('出発時刻: 09:00');
    fireEvent.click(screen.getByRole('button', { name: /徒歩 \(20分\)/ }));
    const after = screen.getByText('出発時刻: 09:00');

    expect(before).toBe(after);
  });

  it('移動手段変更後、DB登録用Payloadに反映される', () => {
    render(<DepartureDetailCard date={date} index={0} />);

    fireEvent.click(screen.getByRole('button', { name: /自転車 \(15分\)/ }));

    expect(mockSwitchAlternativeRoute).toHaveBeenCalledWith(date, 'route-departure-spot', 2);
  });

  describe('複数日対応', () => {
    it('複数日プランで日付ごとに出発地情報が正しく取得される', () => {
      const departure = createDeparture({
        name: '新宿駅',
      });

      mockGetDepartureAndDestination.mockReturnValue(departure);
      mockGetSpotInfo.mockReturnValue([createNextSpot()]);
      mockGetPlanningResult.mockReturnValue({
        routes: [
          {
            id: 'route-departure-spot',
            fromType: 'DEPARTURE',
            toType: 'SPOT',
            transportMethod: 'TRANSIT',
          },
        ],

        totalDistance: 1000,
        totalDuration: 20,
        departureTime: DEFAULT_DEPARTURE_TIME,
        arrivalTime: DEFAULT_ARRIVAL_TIME,
        isOverTime: false,
        updatedSpots: [],
        updatedDeparture: createDeparture(),
        updatedDestination: createDeparture(), // 出発地のテストなので仮置き
      });

      render(<DepartureDetailCard date="2025-12-20" index={0} />);

      expect(screen.getByText(/新宿駅/)).toBeInTheDocument();
      expect(screen.getByText('出発時刻: 09:00')).toBeInTheDocument();
    });

    it('複数日プランで最寄駅が設定されている場合に表示される', () => {
      const departure = createDeparture({
        name: '新宿駅',
        nearestStation: {
          name: '新宿三丁目駅',
          walkingTime: 5,
        },
      });

      mockGetDepartureAndDestination.mockReturnValue(departure);
      mockGetSpotInfo.mockReturnValue([
        createNextSpot({
          nearestStation: {
            name: '東京駅',
            walkingTime: 4,
            transitTime: 12,
            scheduledDepartureTime: '08:20',
          },
        }),
      ]);
      mockGetPlanningResult.mockReturnValue({
        routes: [
          {
            id: 'route-departure-spot',
            fromType: 'DEPARTURE',
            toType: 'SPOT',
            transportMethod: 'TRANSIT',
          },
        ],
        totalDistance: 1000,
        totalDuration: 20,
        departureTime: DEFAULT_DEPARTURE_TIME,
        arrivalTime: DEFAULT_ARRIVAL_TIME,
        isOverTime: false,
        updatedSpots: [],
        updatedDeparture: createDeparture(),
        updatedDestination: createDeparture(), // 出発地のテストなので仮置き
      });

      render(<DepartureDetailCard date="2025-12-20" index={0} />);

      const stationElements = screen.queryAllByText(/新宿三丁目駅/);
      expect(stationElements.length).toBeGreaterThan(0);
    });

    it('複数日で異なる移動手段候補が表示される', () => {
      const departure = createDeparture({
        alternativeTransports: [
          { transportMethodId: 1, transportMethod: 'WALKING', durationText: '20分' },
          { transportMethodId: 2, transportMethod: 'BICYCLING', durationText: '15分' },
        ],
      });

      mockGetDepartureAndDestination.mockReturnValue(departure);
      mockGetSpotInfo.mockReturnValue([createNextSpot()]);
      mockGetPlanningResult.mockReturnValue({
        routes: [
          {
            id: 'route-departure-spot',
            fromType: 'DEPARTURE',
            toType: 'SPOT',
            transportMethod: 'TRANSIT',
          },
        ],
        totalDistance: 1000,
        totalDuration: 20,
        departureTime: DEFAULT_DEPARTURE_TIME,
        arrivalTime: DEFAULT_ARRIVAL_TIME,
        isOverTime: false,
        updatedSpots: [],
        updatedDeparture: createDeparture(),
        updatedDestination: createDeparture(), // 出発地のテストなので仮置き
      });

      render(<DepartureDetailCard date="2025-12-21" index={0} />);

      expect(screen.getByRole('button', { name: /徒歩 \(20分\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /自転車 \(15分\)/ })).toBeInTheDocument();
    });
  });
});
