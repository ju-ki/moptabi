import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPlanningResult, mockIsPlanningDirty, mockRestorePlannedSpots } = vi.hoisted(() => ({
  mockGetPlanningResult: vi.fn(),
  mockIsPlanningDirty: vi.fn(),
  mockRestorePlannedSpots: vi.fn(),
}));

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getPlanningResult: mockGetPlanningResult,
    isPlanningDirty: mockIsPlanningDirty,
    restorePlannedSpots: mockRestorePlannedSpots,
  }),
}));

import PlanConsistencyAction from '@/components/PlanConsistencyAction';

describe('PlanConsistencyAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('プランニング結果がない場合は表示されないこと', () => {
    mockGetPlanningResult.mockReturnValue(undefined);

    const { container } = render(<PlanConsistencyAction date="2026-06-01" />);

    expect(container.firstChild).toBeNull();
  });

  it('dirty状態の場合は警告文言を表示し、復元ボタン押下で復元処理を呼ぶこと', async () => {
    mockGetPlanningResult.mockReturnValue({ routes: [] });
    mockIsPlanningDirty.mockReturnValue(true);

    render(<PlanConsistencyAction date="2026-06-01" />);

    expect(screen.getByTestId('plan-consistency-dirty-2026-06-01')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('plan-consistency-restore-2026-06-01'));

    expect(mockRestorePlannedSpots).toHaveBeenCalledWith('2026-06-01');
  });
});
