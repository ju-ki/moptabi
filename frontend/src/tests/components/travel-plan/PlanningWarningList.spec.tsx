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

  it('エラーは赤枠、警告は黄色枠、情報は青枠で表示する', () => {
    mockGetPlanningResult.mockReturnValue({
      messages: [
        { level: 'ERROR', segmentKey: 'DAY_OVERFLOW', message: '到着時刻が23:59を超えています。' },
        { level: 'WARNING', segmentKey: 'OVER_TIME', message: '到着時間を超過しています' },
        { level: 'INFO', segmentKey: 'EXTRA_TIME', message: '余裕時間があります' },
      ],
    });

    render(<PlanningWarningList date={date} />);

    // 枠の色は Tailwind のクラスでしか判別できないため、クラス名で確認する
    expect(screen.getByTestId('planning-message-error').className).toContain('text-destructive');
    expect(screen.getByTestId('planning-message-warning').className).toContain('border-amber-300');
    expect(screen.getByTestId('planning-message-warning').className).not.toContain('text-destructive');
    expect(screen.getByTestId('planning-message-info').className).toContain('border-blue-200');
  });

  it('エラーがあるときは保存できない旨を表示し、一覧を閉じても残す', () => {
    mockGetPlanningResult.mockReturnValue({
      messages: [{ level: 'ERROR', segmentKey: 'DAY_OVERFLOW', message: '到着時刻が23:59を超えています。' }],
    });

    render(<PlanningWarningList date={date} />);

    expect(screen.getByTestId('planning-save-blocked')).toHaveTextContent(
      'エラーがあるため、このプランニング結果は保存できません。',
    );

    fireEvent.click(screen.getByRole('button', { name: '警告メッセージ一覧' }));

    expect(screen.getByTestId('planning-save-blocked')).toBeInTheDocument();
  });

  it('警告だけのときは保存できない旨を表示しない', () => {
    mockGetPlanningResult.mockReturnValue({
      messages: [{ level: 'WARNING', segmentKey: 'OVER_TIME', message: '到着時間を超過しています' }],
    });

    render(<PlanningWarningList date={date} />);

    expect(screen.queryByTestId('planning-save-blocked')).not.toBeInTheDocument();
  });
});
