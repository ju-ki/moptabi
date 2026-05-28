import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PlanningWarningList from '@/components/travel-plan/PlanningWarningList';

const mockGetPlanningResult = vi.fn();
const mockGetDepartureAndDestination = vi.fn();
const mockGetSpotInfo = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getPlanningResult: mockGetPlanningResult,
    getDepartureAndDestination: mockGetDepartureAndDestination,
    getSpotInfo: mockGetSpotInfo,
  }),
}));

describe('PlanningWarningList', () => {
  const date = '2026-05-16';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartureAndDestination.mockImplementation((targetDate: string, type: string) => {
      if (targetDate !== date) return null;
      if (type === 'DEPARTURE') return { name: '東京駅' };
      if (type === 'DESTINATION') return { name: '羽田空港' };
      return null;
    });
    mockGetSpotInfo.mockReturnValue([
      { id: 'spot-1', location: { name: '浅草寺' } },
      { id: 'spot-2', location: { name: '東京タワー' } },
    ]);
  });

  it('初期表示時に警告メッセージ一覧を開いた状態で表示する', () => {
    mockGetPlanningResult.mockReturnValue({
      messages: [
        { level: 'WARNING', segmentKey: 'OVER_TIME', message: '到着時間を超過しています' },
        { level: 'INFO', segmentKey: 'EXTRA_TIME', message: '余裕時間があります' },
      ],
    });

    render(<PlanningWarningList date={date} />);

    expect(screen.getByText('警告メッセージ一覧')).toBeInTheDocument();
    expect(screen.getByText('到着時間を超過しています')).toBeInTheDocument();
    expect(screen.getByText('余裕時間があります')).toBeInTheDocument();
  });

  it('閉じる操作でメッセージを隠してルート情報を表示する', () => {
    mockGetPlanningResult.mockReturnValue({
      messages: [{ level: 'WARNING', segmentKey: 'OVER_TIME', message: '到着時間を超過しています' }],
    });

    render(<PlanningWarningList date={date} />);

    fireEvent.click(screen.getByRole('button', { name: '警告メッセージ一覧' }));

    expect(screen.queryByText('到着時間を超過しています')).not.toBeInTheDocument();
    expect(screen.getByTestId('planning-route-summary')).toBeInTheDocument();
    expect(screen.getByText('東京駅 → 羽田空港')).toBeInTheDocument();
  });
});
