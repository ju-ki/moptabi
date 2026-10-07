import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockPush,
  mockToast,
  mockPostTrip,
  mockResetPlanningStore,
  mockGetDirtyPlanningDates,
  mockGetPlanningMessages,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: vi.fn(),
  mockPostTrip: vi.fn(),
  mockResetPlanningStore: vi.fn(),
  mockGetDirtyPlanningDates: vi.fn<() => string[]>(() => []),
  mockGetPlanningMessages: vi.fn<() => { level: string; segmentKey: string; message: string }[]>(() => []),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => '123'),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/hooks/use-trip', () => ({
  useFetchTripDetail: () => ({
    postTrip: mockPostTrip,
  }),
}));

vi.mock('@/lib/plan', () => {
  const useStoreForPlanning = Object.assign(
    () => ({
      title: 'テスト旅行',
      imageUrl: '',
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      plans: [],
      getSpotInfo: () => [
        {
          id: 'spot-1',
          memo: '',
        },
      ],
      getPlanInfo: () => ({
        date: '2026-06-01',
        memo: '',
      }),
      getPlanningResult: () => ({
        date: '2026-06-01',
        updatedDeparture: {
          id: 'spot-1',
          memo: '',
        },
        updatedDestination: {
          id: 'spot-1',
          memo: '',
        },
        arrivalTime: '18:00',
        departureTime: '08:00',
        messages: mockGetPlanningMessages(),
      }),

      getDirtyPlanningDates: mockGetDirtyPlanningDates,
      setErrors: vi.fn(),
      setTripInfoErrors: vi.fn(),
      setDepartureAndDestination: vi.fn(),
      setPlanErrors: vi.fn(),
      setSpotErrors: vi.fn(),
      resetPlanningStore: mockResetPlanningStore,
    }),
    {
      getState: vi.fn(() => ({
        plans: [],
      })),
    },
  );

  return { useStoreForPlanning };
});

import CreatePlanButton from '@/components/CreatePlanButton';
import { PLANNING_DIRTY_BLOCK_MESSAGE, PLANNING_ERROR_BLOCK_MESSAGE } from '@/data/constants';

describe('CreatePlanButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDirtyPlanningDates.mockReturnValue([]);
    mockGetPlanningMessages.mockReturnValue([]);
  });

  it('保存成功で詳細画面へ遷移する場合、遷移前にストアを初期化すること', async () => {
    mockPostTrip.mockResolvedValue(123);

    render(<CreatePlanButton isEdit={false} />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockPostTrip).toHaveBeenCalledTimes(1);
    });

    expect(mockResetPlanningStore).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/plan/123');
  });

  it('保存失敗の場合はストア初期化を実行しないこと', async () => {
    mockPostTrip.mockRejectedValue(new Error('failed'));

    render(<CreatePlanButton isEdit={false} />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    expect(mockResetPlanningStore).not.toHaveBeenCalled();
  });

  it('dirty日付が存在する場合は保存をブロックし、APIを呼ばないこと', async () => {
    mockGetDirtyPlanningDates.mockReturnValue(['2026-06-01']);

    render(<CreatePlanButton isEdit={false} />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    expect(mockPostTrip).not.toHaveBeenCalled();
    expect(mockResetPlanningStore).not.toHaveBeenCalled();
  });

  it('dirty日付が存在する場合は、dirty の理由のトーストだけを出すこと', async () => {
    mockGetDirtyPlanningDates.mockReturnValue(['2026-06-01']);

    render(<CreatePlanButton isEdit={false} />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    // トーストは1件しか表示されないため、後から別のトーストで上書きしない
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: PLANNING_DIRTY_BLOCK_MESSAGE.title }));
  });

  it('プランニング結果にエラーがある場合は保存をブロックし、エラーのトーストを出すこと', async () => {
    mockGetPlanningMessages.mockReturnValue([
      { level: 'ERROR', segmentKey: 'DAY_OVERFLOW', message: '到着時刻が23:59を超えています。' },
    ]);

    render(<CreatePlanButton isEdit={false} />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: PLANNING_ERROR_BLOCK_MESSAGE.title,
      description: PLANNING_ERROR_BLOCK_MESSAGE.description,
      variant: 'destructive',
    });
    expect(mockPostTrip).not.toHaveBeenCalled();
    expect(mockResetPlanningStore).not.toHaveBeenCalled();
  });

  it('プランニング結果が警告だけの場合は保存できること', async () => {
    mockPostTrip.mockResolvedValue(123);
    mockGetPlanningMessages.mockReturnValue([
      { level: 'WARNING', segmentKey: 'OVER_TIME', message: '滞在時間を10分減らしてみましょう。' },
    ]);

    render(<CreatePlanButton isEdit={false} />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockPostTrip).toHaveBeenCalledTimes(1);
    });
  });
});
