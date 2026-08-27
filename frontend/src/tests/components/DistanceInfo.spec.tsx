import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DistanceInfo from '@/components/DistanceInfo';
import { TransportNodeType } from '@/types/plan';

const mockGetDepartureAndDestination = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getDepartureAndDestination: mockGetDepartureAndDestination,
    getPlanningResult: vi.fn().mockReturnValue({
      totalDuration: 120,
    }),
  }),
}));

vi.mock('@/lib/algorithm', async () => {
  const actual = await vi.importActual<any>('@/lib/algorithm');
  return {
    ...actual,
    calcDistance: vi.fn().mockReturnValue('1.0km'),
    calcTotalTransportTime: vi.fn().mockReturnValue('60分'),
  };
});

function createSpot(overrides: any = {}) {
  return {
    id: 'spot-1',
    order: 1,
    location: { id: 'loc-1', name: '浅草寺', lat: 35.71, lng: 139.79 },
    stayStart: '10:00',
    stayEnd: '11:00',
    stayDuration: 60,
    transports: {
      transportMethod: 1,
      name: 'WALKING',
      travelTime: '20分',
      fromType: TransportNodeType.SPOT,
      toType: TransportNodeType.SPOT,
    },
    ...overrides,
  };
}

describe('DistanceInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartureAndDestination.mockImplementation((date: string, type: TransportNodeType) => {
      if (type === TransportNodeType.DEPARTURE) {
        return {
          name: '東京駅',
          latitude: 35.6812,
          longitude: 139.7671,
          transports: {
            name: 'WALKING',
            travelTime: '20分',
          },
        };
      }
      return {
        name: '目的地',
        latitude: 35.69,
        longitude: 139.7,
        transports: {
          name: 'WALKING',
          travelTime: '20分',
        },
      };
    });
  });

  // SPEC: PC-DI-001
  it('最寄駅あり区間を3分割で表示する', () => {
    const spots = [
      createSpot({
        nearestStation: {
          placeId: 'st-1',
          name: '浅草駅',
          stationType: 'TRAIN',
          walkingTime: 4,
          latitude: 35.71,
          longitude: 139.79,
        },
      }),
    ];

    mockGetDepartureAndDestination.mockImplementation((date: string, type: TransportNodeType) => {
      if (type === TransportNodeType.DEPARTURE) {
        return {
          name: '東京駅',
          latitude: 35.6812,
          longitude: 139.7671,
          nearestStation: {
            placeId: 'st-0',
            name: '東京駅',
            stationType: 'TRAIN',
            walkingTime: 3,
            latitude: 35.6812,
            longitude: 139.7671,
          },
          transports: {
            name: 'WALKING',
            travelTime: '20分',
          },
        };
      }
      return {
        name: '目的地',
        latitude: 35.69,
        longitude: 139.7,
        transports: {
          name: 'WALKING',
          travelTime: '20分',
        },
      };
    });

    render(<DistanceInfo date="2025-12-20" spots={spots as any} />);

    fireEvent.click(screen.getByText(/次の移動:/));

    const segmentBlocks = screen.getAllByTestId('distance-segment-rows');
    const firstSegmentRows = within(segmentBlocks[0]).getAllByText(/→/);
    expect(firstSegmentRows).toHaveLength(3);
  });

  // SPEC: PC-DI-002
  it('最寄駅なし区間を1行で表示する', () => {
    const spots = [createSpot()];

    render(<DistanceInfo date="2025-12-20" spots={spots as any} />);

    fireEvent.click(screen.getByText(/次の移動:/));

    const segmentBlocks = screen.getAllByTestId('distance-segment-rows');
    const firstSegmentRows = within(segmentBlocks[0]).getAllByText(/→/);
    expect(firstSegmentRows).toHaveLength(1);
  });
});
