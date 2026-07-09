import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ArrivalTimeWarning from '@/components/travel-plan/ArrivalTimeWarning';

const mockGetPlanningResult = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getPlanningResult: mockGetPlanningResult,
  }),
}));

describe('ArrivalTimeWarning', () => {
  const date = '2026-05-16';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('到着超過時に推奨出発時刻と短縮分を表示する', () => {
    mockGetPlanningResult.mockReturnValue({
      arrivalWarning: {
        exceededMinutes: 25,
        suggestedDepartureTime: '08:35',
        suggestedStayReductionMinutes: 25,
      },
    });

    render(<ArrivalTimeWarning date={date} />);

    expect(screen.getByText('到着時間を超過しています')).toBeInTheDocument();
    expect(screen.getByText('08:35')).toBeInTheDocument();
    expect(screen.getByText('25分超過')).toBeInTheDocument();
    expect(screen.getByText('出発時間を 25分 早めてください')).toBeInTheDocument();
    expect(screen.getByText('各スポットの滞在時間を合計 25分 短縮してください')).toBeInTheDocument();
  });

  it('提案は折りたたみ可能である', () => {
    mockGetPlanningResult.mockReturnValue({
      arrivalWarning: {
        exceededMinutes: 10,
        suggestedDepartureTime: '08:50',
        suggestedStayReductionMinutes: 10,
      },
    });

    render(<ArrivalTimeWarning date={date} />);

    fireEvent.click(screen.getByRole('button', { name: /改善の提案/ }));

    expect(screen.queryByText('出発時間を 10分 早めてください')).not.toBeInTheDocument();
  });
});
