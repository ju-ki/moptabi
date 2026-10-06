import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanLocationCandidateResponseType } from '@shared/user/types';

const { mockResetPlanningStore, mockAddDateWithDefaultLocation, mockCandidatesState } = vi.hoisted(() => ({
  mockResetPlanningStore: vi.fn(),
  mockAddDateWithDefaultLocation: vi.fn(),
  // 候補APIの戻り値をテストごとに切り替えるための状態
  mockCandidatesState: {
    candidates: null as PlanLocationCandidateResponseType | null,
    isLoading: true,
  },
}));

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    errors: {},
    resetPlanningStore: mockResetPlanningStore,
    addDateWithDefaultLocation: mockAddDateWithDefaultLocation,
    setDepartureList: vi.fn(),
    setDestinationList: vi.fn(),
    setFields: vi.fn(),
    setRangeDate: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-plan-location', () => ({
  usePlanLocationCandidates: () => ({
    candidates: mockCandidatesState.candidates,
    isLoading: mockCandidatesState.isLoading,
  }),
}));

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

import TravelPlanCreate from '@/app/plan/create/page';

describe('plan/create page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCandidatesState.candidates = null;
    mockCandidatesState.isLoading = true;
  });

  it('画面を離脱した場合、プラン作成ストアを初期化すること', () => {
    const { unmount } = render(<TravelPlanCreate />);

    unmount();

    expect(mockResetPlanningStore).toHaveBeenCalledTimes(1);
  });

  it('画面をマウントした際もプラン作成ストアを初期化すること', () => {
    render(<TravelPlanCreate />);

    expect(mockResetPlanningStore).toHaveBeenCalled();
  });

  it('最寄駅付きのデフォルト出発地がある場合、最寄駅が選択された状態で出発地をセットすること', () => {
    mockCandidatesState.isLoading = false;
    mockCandidatesState.candidates = {
      favorites: [
        {
          name: '自宅',
          latitude: 35.6895,
          longitude: 139.6917,
          label: null,
          isDefault: true,
          locationType: 'DEPARTURE',
          usageCount: 0,
          planId: null,
          planName: null,
          userLocationId: 10,
          planLocationId: null,
          nearestStation: {
            placeId: 'station-place-id',
            stationType: 'TRAIN',
            latitude: 35.6905,
            longitude: 139.7004,
            name: '新宿駅',
            transitTime: 0,
            walkingTime: 8,
          },
        },
      ],
      history: [],
    };

    render(<TravelPlanCreate />);

    expect(mockAddDateWithDefaultLocation).toHaveBeenCalledWith(
      '2026-06-01',
      expect.objectContaining({
        name: '自宅',
        userLocationId: 10,
        transportMethod: 'TRANSIT',
        isSetSelectedNearestStation: true,
        nearestStation: expect.objectContaining({ placeId: 'station-place-id', name: '新宿駅' }),
      }),
      expect.objectContaining({ locationType: 'DESTINATION' }),
    );
  });
});
