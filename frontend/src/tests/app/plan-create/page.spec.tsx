import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockResetPlanningStore } = vi.hoisted(() => ({
  mockResetPlanningStore: vi.fn(),
}));

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    errors: {},
    resetPlanningStore: mockResetPlanningStore,
    addDateWithDefaultLocation: vi.fn(),
    setDepartureList: vi.fn(),
    setDestinationList: vi.fn(),
    setFields: vi.fn(),
    setRangeDate: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-plan-location', () => ({
  usePlanLocationCandidates: () => ({
    candidates: null,
    isLoading: true,
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
});
