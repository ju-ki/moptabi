import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DayPlan } from '@/components/DayPlan';

/**
 * DayPlan テスト
 * 1日分の旅行プランカードの表示内容を検証する
 */

// 子コンポーネントをモック化（外部依存を最小化）
vi.mock('@/components/SpotInfoCard', () => ({
  SpotInfoCard: ({ spot }: any) => <div data-testid={`spot-info-${spot.id}`}>{spot.location.name}</div>,
}));

vi.mock('@/components/RouteSummary', () => ({
  default: () => <div data-testid="route-summary">RouteSummary</div>,
}));

vi.mock('@/components/SpotSummary', () => ({
  default: () => <div data-testid="spot-summary">SpotSummary</div>,
}));

vi.mock('@/components/DepartureInfoCard', () => ({
  DepartureInfoCard: ({ departure }: any) => <div data-testid="departure-info">{departure.name}</div>,
}));

vi.mock('@/components/DestinationInfoCard', () => ({
  DestinationInfoCard: ({ destination }: any) => <div data-testid="destination-info">{destination.name}</div>,
}));

// Mock useStoreForPlanning
vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';

const createMockFields = (overrides: any = {}) => ({
  getSpotInfo: vi.fn().mockReturnValue([]),
  getDepartureAndDestination: vi.fn().mockReturnValue(null),
  ...overrides,
});

describe('DayPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('日目番号が表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      expect(screen.getByText(/1日目/)).toBeInTheDocument();
    });

    it('日付がフォーマットされて表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      expect(screen.getByText(/2025年12月20日/)).toBeInTheDocument();
    });

    it('タイムラインセクションが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      expect(screen.getByText('タイムライン')).toBeInTheDocument();
    });
  });

  describe('スポット一覧の表示', () => {
    it('スポットが存在する場合は一覧が表示されること', () => {
      const mockSpots = [
        { id: 'spot-1', location: { name: '東京タワー', lat: 35.6586, lng: 139.7454 } },
        { id: 'spot-2', location: { name: '浅草寺', lat: 35.7148, lng: 139.7967 } },
      ];

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          getSpotInfo: vi.fn().mockReturnValue(mockSpots),
        }),
      );

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      expect(screen.getByTestId('spot-info-spot-1')).toBeInTheDocument();
      expect(screen.getByTestId('spot-info-spot-2')).toBeInTheDocument();
    });

    it('スポットがない場合はスポット一覧が空であること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      // スポットカードが表示されないことを確認
      expect(screen.queryByTestId(/spot-info-/)).not.toBeInTheDocument();
    });
  });

  describe('出発地と目的地の表示', () => {
    it('出発地データがある場合は表示されること', () => {
      const mockDeparture = { name: '東京駅' };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          getDepartureAndDestination: vi.fn().mockImplementation((date, type) => {
            if (type === TransportNodeType.DEPARTURE) return mockDeparture;
            return null;
          }),
        }),
      );

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      expect(screen.getByTestId('departure-info')).toBeInTheDocument();
      expect(screen.getByText('東京駅')).toBeInTheDocument();
    });

    it('目的地データがある場合は表示されること', () => {
      const mockDestination = { name: '羽田空港' };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          getDepartureAndDestination: vi.fn().mockImplementation((date, type) => {
            if (type === TransportNodeType.DESTINATION) return mockDestination;
            return null;
          }),
        }),
      );

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      expect(screen.getByTestId('destination-info')).toBeInTheDocument();
      expect(screen.getByText('羽田空港')).toBeInTheDocument();
    });

    it('出発地・目的地がない場合はそのセクションが表示されないこと', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      const plan = { date: '2025-12-20', spots: [] };
      render(<DayPlan plan={plan} dayNumber={1} />);

      expect(screen.queryByTestId('departure-info')).not.toBeInTheDocument();
      expect(screen.queryByTestId('destination-info')).not.toBeInTheDocument();
    });
  });

  describe('複数日の場合', () => {
    it('dayNumberが正しく表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      const plan = { date: '2025-12-22', spots: [] };
      render(<DayPlan plan={plan} dayNumber={3} />);

      expect(screen.getByText(/3日目/)).toBeInTheDocument();
    });
  });
});
