import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import TravelPlan from '@/components/TravelPlan';

/**
 * TravelPlan テスト
 * シミュレーションステータスに応じたプランの表示状態を検証する
 */

// 子コンポーネントをモック化（外部依存を最小化）
vi.mock('@/components/TravelMap', () => ({
  default: () => <div data-testid="travel-map">TravelMap</div>,
}));

vi.mock('@/components/travel-plan/SpotDetailCard', () => ({
  default: ({ spot }: any) => <div data-testid={`spot-detail-${spot.id}`}>{spot.location.name}</div>,
}));

vi.mock('@/components/travel-plan/DepartureDetailCard', () => ({
  default: ({ departure }: any) => <div data-testid="departure-detail">{departure.name}</div>,
}));

vi.mock('@/components/travel-plan/DestinationDetailCard', () => ({
  default: ({ destination }: any) => <div data-testid="destination-detail">{destination.name}</div>,
}));

// Mock useStoreForPlanning
vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

import { useStoreForPlanning } from '@/lib/plan';

const createMockFields = (overrides: Partial<ReturnType<typeof useStoreForPlanning>> = {}) => ({
  simulationStatus: null as { date: string; status: number }[] | null,
  getSpotInfo: vi.fn().mockReturnValue([]),
  getDepartureAndDestination: vi.fn().mockReturnValue(null),
  setSpots: vi.fn(),
  plans: [{ date: '2025-12-20', spots: [] }],
  planErrors: {},
  ...overrides,
});

const mockTravelPlan = { date: '2025-12-20', spots: [], departure: null, destination: null };

describe('TravelPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('シミュレーションステータスに応じた表示', () => {
    it('simulationStatusがnullの場合、案内メッセージが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ simulationStatus: null }));

      render(<TravelPlan travelPlan={mockTravelPlan} />);

      expect(screen.getByText(/観光地を選択して、上記のプラン作成ボタンを押下してください/)).toBeInTheDocument();
    });

    it('simulationStatusが0の場合、案内メッセージが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({ simulationStatus: [{ date: '2025-12-20', status: 0 }] }),
      );

      render(<TravelPlan travelPlan={mockTravelPlan} />);

      expect(screen.getByText(/観光地を選択して、上記のプラン作成ボタンを押下してください/)).toBeInTheDocument();
    });

    it('simulationStatusが1の場合、「プラン作成中です」が表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({ simulationStatus: [{ date: '2025-12-20', status: 1 }] }),
      );

      render(<TravelPlan travelPlan={mockTravelPlan} />);

      expect(screen.getByText('プラン作成中です')).toBeInTheDocument();
    });

    it('simulationStatusが9の場合、エラーメッセージが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({ simulationStatus: [{ date: '2025-12-20', status: 9 }] }),
      );

      render(<TravelPlan travelPlan={mockTravelPlan} />);

      expect(screen.getByText(/未入力項目があります/)).toBeInTheDocument();
    });

    it('simulationStatusが2の場合、プランのフルビューが表示されること', () => {
      const mockSpots = [{ id: 'spot-1', location: { name: '東京タワー', lat: 35.6586, lng: 139.7454 } }];
      const mockDeparture = { name: '東京駅' };
      const mockDestination = { name: '羽田空港' };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          simulationStatus: [{ date: '2025-12-20', status: 2 }],
          getSpotInfo: vi.fn().mockReturnValue(mockSpots),
          getDepartureAndDestination: vi.fn().mockReturnValueOnce(mockDeparture).mockReturnValueOnce(mockDestination),
        }),
      );

      render(<TravelPlan travelPlan={mockTravelPlan} />);

      expect(screen.getByTestId('travel-map')).toBeInTheDocument();
      expect(screen.getByTestId('departure-detail')).toBeInTheDocument();
      expect(screen.getByTestId('spot-detail-spot-1')).toBeInTheDocument();
      expect(screen.getByTestId('destination-detail')).toBeInTheDocument();
    });
  });

  describe('travelPlanがnullの場合', () => {
    it('nullを渡した場合は何も表示されないこと', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      const { container } = render(<TravelPlan travelPlan={null as any} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('スポット一覧の表示', () => {
    it('スポットが複数ある場合は全て表示されること', () => {
      const mockSpots = [
        { id: 'spot-1', location: { name: '東京タワー', lat: 35.6586, lng: 139.7454 } },
        { id: 'spot-2', location: { name: '浅草寺', lat: 35.7148, lng: 139.7967 } },
      ];

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          simulationStatus: [{ date: '2025-12-20', status: 2 }],
          getSpotInfo: vi.fn().mockReturnValue(mockSpots),
        }),
      );

      render(<TravelPlan travelPlan={mockTravelPlan} />);

      expect(screen.getByTestId('spot-detail-spot-1')).toBeInTheDocument();
      expect(screen.getByTestId('spot-detail-spot-2')).toBeInTheDocument();
    });
  });
});
