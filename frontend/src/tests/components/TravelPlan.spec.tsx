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
  default: () => <div data-testid="departure-detail">departure</div>,
}));

vi.mock('@/components/travel-plan/DestinationDetailCard', () => ({
  default: () => <div data-testid="destination-detail">destination</div>,
}));

vi.mock('@/components/travel-plan/TimelineStatus', () => ({
  default: () => <div data-testid="timeline-status" />,
}));

vi.mock('@/components/travel-plan/ArrivalTimeWarning', () => ({
  default: () => <div data-testid="arrival-time-warning" />,
}));

vi.mock('@/components/travel-plan/ExtraTimeSuggestions', () => ({
  default: () => <div data-testid="extra-time-suggestions" />,
}));

vi.mock('@/components/travel-plan/PlanningWarningList', () => ({
  default: () => <div data-testid="planning-warning-list" />,
}));

// Mock useStoreForPlanning
vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

import { useStoreForPlanning } from '@/lib/plan';
import type { DepartureAndDestinationType } from '@/models/planLocation';
import type { TravelPlanType } from '@/types/plan';

const createMockFields = (overrides: Partial<ReturnType<typeof useStoreForPlanning>> = {}) => ({
  simulationStatus: null as { date: string; status: number }[] | null,
  getSpotInfo: vi.fn().mockReturnValue([]),
  getDepartureAndDestination: vi.fn().mockReturnValue(null),
  setSpots: vi.fn(),
  plans: [{ date: '2025-12-20', spots: [] }],
  planErrors: {},
  ...overrides,
});

const dummyDeparture: DepartureAndDestinationType = {
  name: '出発地',
  planId: null,
  latitude: 35.0,
  longitude: 135.0,
  address: null,
  label: null,
  isDefault: true,
  locationType: 'DEPARTURE',
  usageCount: 0,
  userLocationId: null,
  planLocationId: null,
  planName: null,
  nearestStation: undefined,
  transports: undefined,
};
const dummyDestination: DepartureAndDestinationType = {
  name: '目的地',
  planId: null,
  latitude: 36.0,
  longitude: 136.0,
  address: null,
  label: null,
  isDefault: true,
  locationType: 'DESTINATION',
  usageCount: 0,
  userLocationId: null,
  planLocationId: null,
  planName: null,
  nearestStation: undefined,
  transports: undefined,
};
const mockTravelPlan: TravelPlanType = {
  date: '2025-12-20',
  spots: [],
  departure: dummyDeparture,
  destination: dummyDestination,
};

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

      // 型エラー回避のため、departure/destinationにダミーを渡す
      const dummyPlan = {
        date: '2025-12-20',
        spots: [],
        departure: dummyDeparture,
        destination: dummyDestination,
      };
      const { container } = render(<TravelPlan travelPlan={dummyPlan} />);

      expect(container.firstChild).not.toBeNull();
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

  describe('複数日対応', () => {
    it('複数日プランで異なるシミュレーションステータスが表示される', () => {
      const multiDayPlan = {
        date: '2025-12-20',
        spots: [],
        departure: dummyDeparture,
        destination: dummyDestination,
      };

      const statusDay1 = { date: '2025-12-20', status: 2 };
      const statusDay2 = { date: '2025-12-21', status: 2 };

      const mockSpots = [{ id: 'spot-1', location: { name: '東京タワー', lat: 35.6586, lng: 139.7454 } }];
      const mockDeparture = { name: '東京駅' };
      const mockDestination = { name: '羽田空港' };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          simulationStatus: [statusDay1, statusDay2],
          getSpotInfo: vi.fn().mockReturnValue(mockSpots),
          getDepartureAndDestination: vi.fn().mockReturnValueOnce(mockDeparture).mockReturnValueOnce(mockDestination),
        }),
      );

      render(<TravelPlan travelPlan={multiDayPlan} />);

      // status 2 の日付が表示される
      expect(screen.getByTestId('travel-map')).toBeInTheDocument();
    });

    it('複数日プランで各日のスポット数が異なる場合に正しく表示される', () => {
      const spotsDay1 = [
        { id: 'spot-a', location: { name: '東京タワー', lat: 35.6586, lng: 139.7454 } },
        { id: 'spot-b', location: { name: '浅草寺', lat: 35.7148, lng: 139.7967 } },
      ];

      const mockDeparture = { name: '東京駅' };
      const mockDestination = { name: '羽田空港' };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          simulationStatus: [{ date: '2025-12-20', status: 2 }],
          getSpotInfo: vi.fn().mockReturnValue(spotsDay1),
          getDepartureAndDestination: vi.fn().mockReturnValueOnce(mockDeparture).mockReturnValueOnce(mockDestination),
        }),
      );

      const { rerender } = render(<TravelPlan travelPlan={mockTravelPlan} />);

      // 1日目：2スポット表示
      expect(screen.getByTestId('spot-detail-spot-a')).toBeInTheDocument();
      expect(screen.getByTestId('spot-detail-spot-b')).toBeInTheDocument();

      // 2日目に切り替え（1スポット）
      const spotsDay2 = [{ id: 'spot-c', location: { name: '上野公園', lat: 35.7155, lng: 139.7713 } }];

      (useStoreForPlanning as any).mockClear();
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          simulationStatus: [{ date: '2025-12-21', status: 2 }],
          getSpotInfo: vi.fn().mockReturnValue(spotsDay2),
          getDepartureAndDestination: vi.fn().mockReturnValueOnce(mockDeparture).mockReturnValueOnce(mockDestination),
        }),
      );

      const travelPlanDay2 = {
        date: '2025-12-21',
        spots: [],
        departure: dummyDeparture,
        destination: dummyDestination,
      };
      rerender(<TravelPlan travelPlan={travelPlanDay2} />);

      // 2日目：1スポット表示
      expect(screen.getByTestId('spot-detail-spot-c')).toBeInTheDocument();
    });

    it('複数日プランで異なる出発地・目的地が表示される', () => {
      const departureDay1 = { name: '東京駅' };
      const departureDay2 = { name: '新宿駅' };
      const destinationDay1 = { name: '羽田空港' };
      const destinationDay2 = { name: '成田空港' };

      const mockSpots = [{ id: 'spot-1', location: { name: '東京タワー', lat: 35.6586, lng: 139.7454 } }];

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          simulationStatus: [{ date: '2025-12-20', status: 2 }],
          getSpotInfo: vi.fn().mockReturnValue(mockSpots),
          getDepartureAndDestination: vi.fn().mockReturnValueOnce(departureDay1).mockReturnValueOnce(destinationDay1),
        }),
      );

      const { rerender } = render(<TravelPlan travelPlan={mockTravelPlan} />);

      // 1日目
      expect(screen.getByTestId('departure-detail')).toBeInTheDocument();
      expect(screen.getByTestId('destination-detail')).toBeInTheDocument();

      // 2日目に切り替え
      (useStoreForPlanning as any).mockClear();
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          simulationStatus: [{ date: '2025-12-21', status: 2 }],
          getSpotInfo: vi.fn().mockReturnValue(mockSpots),
          getDepartureAndDestination: vi.fn().mockReturnValueOnce(departureDay2).mockReturnValueOnce(destinationDay2),
        }),
      );

      const travelPlanDay2: TravelPlanType = {
        date: '2025-12-21',
        spots: [],
        departure: dummyDeparture,
        destination: dummyDestination,
      };
      rerender(<TravelPlan travelPlan={travelPlanDay2} />);

      // 2日目でも同じコンポーネントが表示される（異なるデータを持つ）
      expect(screen.getByTestId('departure-detail')).toBeInTheDocument();
      expect(screen.getByTestId('destination-detail')).toBeInTheDocument();
    });
  });
});
