import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TimelineStatus from '@/components/travel-plan/TimelineStatus';

const mockGetPlanningResult = vi.fn();
const mockGetDepartureAndDestination = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getPlanningResult: mockGetPlanningResult,
    getDepartureAndDestination: mockGetDepartureAndDestination,
  }),
}));

describe('TimelineStatus', () => {
  const date = '2026-05-16';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('計算前の出発時刻と到着時刻、計算後の出発時刻と到着時刻を表示する', () => {
    mockGetDepartureAndDestination.mockImplementation((targetDate: string, type: string) => {
      if (targetDate !== date) return null;
      if (type === 'DEPARTURE') return { time: '09:00' };
      if (type === 'DESTINATION') return { time: '18:00' };
      return null;
    });
    mockGetPlanningResult.mockReturnValue({
      departureTime: '09:15',
      arrivalTime: '17:20',
      isOverTime: false,
    });

    render(<TimelineStatus date={date} />);

    expect(screen.getByText('計算前の出発時刻')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('計算後の出発時刻')).toBeInTheDocument();
    expect(screen.getByText('09:15')).toBeInTheDocument();
    expect(screen.getByText('計算前の到着時刻')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.getByText('計算後の到着時刻')).toBeInTheDocument();
    expect(screen.getByText('17:20')).toBeInTheDocument();
  });

  it('計算後の到着時刻は到着超過時に赤文字で表示される', () => {
    mockGetDepartureAndDestination.mockImplementation((targetDate: string, type: string) => {
      if (targetDate !== date) return null;
      if (type === 'DEPARTURE') return { time: '09:00' };
      if (type === 'DESTINATION') return { time: '18:00' };
      return null;
    });
    mockGetPlanningResult.mockReturnValue({
      departureTime: '09:00',
      arrivalTime: '18:30',
      isOverTime: true,
    });

    render(<TimelineStatus date={date} />);

    expect(screen.getByText('18:30')).toHaveClass('text-red-600');
  });
});
