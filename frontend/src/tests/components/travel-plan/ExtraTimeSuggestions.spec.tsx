import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ExtraTimeSuggestions from '@/components/travel-plan/ExtraTimeSuggestions';

const mockGetPlanningResult = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getPlanningResult: mockGetPlanningResult,
  }),
}));

describe('ExtraTimeSuggestions', () => {
  const date = '2026-05-16';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('余裕時間が30分以上のとき提案を表示する', () => {
    mockGetPlanningResult.mockReturnValue({
      extraTimeMinutes: 45,
      extraTimeMessage: 'お気に入りのスポットでもう少しゆっくり過ごしてみては？',
    });

    render(<ExtraTimeSuggestions date={date} />);

    expect(screen.getByTestId('extra-time-suggestions')).toBeInTheDocument();
    expect(screen.getByText('お気に入りのスポットでもう少しゆっくり過ごしてみては？')).toBeInTheDocument();
    expect(screen.getByText('+45分')).toBeInTheDocument();
  });

  it('余裕時間がない場合は何も表示しない', () => {
    mockGetPlanningResult.mockReturnValue({
      extraTimeMinutes: 0,
      extraTimeMessage: undefined,
    });

    const { container } = render(<ExtraTimeSuggestions date={date} />);

    expect(container.firstChild).toBeNull();
  });
});
