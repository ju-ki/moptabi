import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpotSettingList } from '@/components/travel-plan/SpotSettingEditor';

const mockGetSpotInfo = vi.fn();
const mockGetDepartureAndDestination = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getSpotInfo: mockGetSpotInfo,
    getDepartureAndDestination: mockGetDepartureAndDestination,
    editSpots: vi.fn(),
    setSpots: vi.fn(),
  }),
}));

vi.mock('@/components/travel-plan/PlanSpotSettingCard', () => ({
  default: ({ spot }: { spot: { id: string } }) => <div data-testid={`spot-card-${spot.id}`}>{spot.id}</div>,
}));

vi.mock('@/components/travel-plan/nearestStation/NearestStationDeparture', () => ({
  default: ({ date }: { date: string }) => <div data-testid="nearest-station-departure">{date}</div>,
}));

vi.mock('@/components/travel-plan/nearestStation/NearestStationDestination', () => ({
  default: ({ date }: { date: string }) => <div data-testid="nearest-station-destination">{date}</div>,
}));

describe('SpotSettingEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartureAndDestination.mockReturnValue({
      name: '出発地',
      latitude: 35.68,
      longitude: 139.76,
    });
  });

  it('スポットが0件のとき空状態メッセージを表示する', () => {
    mockGetSpotInfo.mockReturnValue([]);

    render(<SpotSettingList date="2026-04-25" />);

    expect(screen.getByText('スポットが選択されていません')).toBeInTheDocument();
    expect(screen.getByText('スポットを追加してください')).toBeInTheDocument();
  });

  it('スポット件数バッジと最寄駅カードを表示する', () => {
    mockGetSpotInfo.mockReturnValue([
      {
        id: 'spot-2',
        order: 2,
        location: { id: 'l2', name: '浅草寺', lat: 35.71, lng: 139.79 },
      },
      {
        id: 'spot-1',
        order: 1,
        location: { id: 'l1', name: '東京駅', lat: 35.68, lng: 139.76 },
      },
    ]);

    render(<SpotSettingList date="2026-04-25" />);

    expect(screen.getByText('2件')).toBeInTheDocument();
    expect(screen.getByTestId('nearest-station-departure')).toHaveTextContent('2026-04-25');
    expect(screen.getByTestId('nearest-station-destination')).toHaveTextContent('2026-04-25');

    const cards = screen.getAllByTestId(/spot-card-/);
    expect(cards[0]).toHaveAttribute('data-testid', 'spot-card-spot-1');
    expect(cards[1]).toHaveAttribute('data-testid', 'spot-card-spot-2');
  });
});
