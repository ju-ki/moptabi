import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TravelEditPage from '@/app/plan/[id]/edit/page';
import { TravelPlanType } from '@/types/plan';

const { mockSetPlanningInfo, mockHandlePreprocessingPlanning, mockTripState } = vi.hoisted(() => ({
  mockSetPlanningInfo: vi.fn(),
  mockHandlePreprocessingPlanning: vi.fn(),
  // 旅行詳細APIの戻り値をテストごとに切り替えるための状態
  mockTripState: {
    trip: null as { title: string; startDate: string; endDate: string; plans: TravelPlanType[] } | null,
  },
}));

// テスト環境の React 18 には use が無いため、params の Promise を解決した値を返すようにする
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, use: () => ({ id: '1' }) };
});

// ストアの呼び出しを検証するためモックする
vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    errors: {},
    resetPlanningStore: vi.fn(),
    setFields: vi.fn(),
    getFields: vi.fn(),
    setRangeDate: vi.fn(),
    setSpots: vi.fn(),
    setPlanInfo: vi.fn(),
    setDepartureAndDestination: vi.fn(),
    setPlanningInfo: mockSetPlanningInfo,
    addDateWithDefaultLocation: vi.fn(),
    setDepartureList: vi.fn(),
    setDestinationList: vi.fn(),
    deletePlanInfo: vi.fn(),
  }),
}));

// 旅行詳細はAPIから取得するためモックする
vi.mock('@/hooks/use-trip', () => ({
  useFetchTripDetail: () => ({ trip: mockTripState.trip, isLoading: false, error: undefined }),
}));

// 初回プランニングはルート計算（Google Maps API）を呼ぶためモックする
vi.mock('@/hooks/use-planning', () => ({
  usePlanning: () => ({ handlePreprocessingPlanning: mockHandlePreprocessingPlanning }),
}));

// 出発地・目的地の候補はAPIから取得するためモックする
vi.mock('@/hooks/use-plan-location', () => ({
  usePlanLocationCandidates: () => ({ candidates: null, isLoading: true }),
}));

// 画面の子コンポーネントはこのテストの対象外のためモックする
vi.mock('@/components/PlanningComp', () => ({
  default: () => <div data-testid="planning-comp" />,
}));

vi.mock('@/components/CreatePlanButton', () => ({
  default: () => <div data-testid="create-plan-button" />,
}));

vi.mock('@/components/DateRangePicker', () => ({
  default: () => <div data-testid="date-range-picker" />,
}));

vi.mock('@/components/common/LimitDisplay', () => ({
  LimitDisplay: () => <div data-testid="limit-display" />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function createSavedPlan(departureMethodId: number, spotMethodIds: number[]): TravelPlanType {
  return {
    date: '2026-06-01',
    departure: {
      name: '出発地',
      latitude: 35.681236,
      longitude: 139.767125,
      locationType: 'DEPARTURE',
      transportMethodId: departureMethodId,
      time: '09:00',
    },
    destination: {
      name: '目的地',
      latitude: 35.681236,
      longitude: 139.767125,
      locationType: 'DESTINATION',
      transportMethodId: 0,
      time: '18:00',
    },
    spots: spotMethodIds.map((methodId, index) => ({
      id: `spot-${index + 1}`,
      name: `スポット${index + 1}`,
      latitude: 35.6895,
      longitude: 139.6917,
      stayStart: '10:00',
      stayEnd: '11:00',
      stayDuration: 60,
      memo: '',
      rating: 4,
      transportMethodId: methodId,
      order: index + 1,
    })),
  } as TravelPlanType;
}

async function renderEditPage() {
  await act(async () => {
    render(<TravelEditPage params={Promise.resolve({ id: '1' })} />);
  });
}

describe('plan/[id]/edit page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTripState.trip = null;
  });

  it('保存済みプランを読み込むと、使っている移動手段（徒歩・自転車・車）をチェック状態に復元すること', async () => {
    mockTripState.trip = {
      title: '旅行',
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      plans: [createSavedPlan(3, [1, 3])],
    };

    await renderEditPage();

    await waitFor(() => {
      expect(mockSetPlanningInfo).toHaveBeenCalledWith('2026-06-01', { transportationMethodId: [1, 3] });
    });
  });

  it('全区間が電車/バスの保存済みプランでは、移動手段のチェックは全て未選択になること', async () => {
    mockTripState.trip = {
      title: '旅行',
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      plans: [createSavedPlan(4, [4])],
    };

    await renderEditPage();

    await waitFor(() => {
      expect(mockSetPlanningInfo).toHaveBeenCalledWith('2026-06-01', { transportationMethodId: [] });
    });
  });

  it('チェック状態の復元は初回プランニングより前に行うこと', async () => {
    mockTripState.trip = {
      title: '旅行',
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      plans: [createSavedPlan(3, [3])],
    };

    await renderEditPage();

    await waitFor(() => {
      expect(mockHandlePreprocessingPlanning).toHaveBeenCalled();
    });
    expect(mockSetPlanningInfo.mock.invocationCallOrder[0]).toBeLessThan(
      mockHandlePreprocessingPlanning.mock.invocationCallOrder[0],
    );
  });
});
