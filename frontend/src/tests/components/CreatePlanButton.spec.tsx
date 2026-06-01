import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPush, mockToast, mockPostTrip, mockResetPlanningStore, mockGetDirtyPlanningDates } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: vi.fn(),
  mockPostTrip: vi.fn(),
  mockResetPlanningStore: vi.fn(),
  mockGetDirtyPlanningDates: vi.fn<() => string[]>(() => []),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    title: 'テスト旅行',
    imageUrl: '',
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    tripInfo: [],
    plans: [],
    getSpotInfo: () => [
      {
        id: 'spot-1',
        memo: '',
      },
    ],
    getDirtyPlanningDates: mockGetDirtyPlanningDates,
    setErrors: vi.fn(),
    setTripInfoErrors: vi.fn(),
    setPlanErrors: vi.fn(),
    setSpotErrors: vi.fn(),
    resetPlanningStore: mockResetPlanningStore,
  }),
}));

import CreatePlanButton from '@/components/CreatePlanButton';

describe('CreatePlanButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDirtyPlanningDates.mockReturnValue([]);
  });

  it('保存成功で詳細画面へ遷移する場合、遷移前にストアを初期化すること', async () => {
    mockPostTrip.mockResolvedValue(123);

    render(<CreatePlanButton />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockPostTrip).toHaveBeenCalledTimes(1);
    });

    expect(mockResetPlanningStore).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/plan/123');
  });

  it('保存失敗の場合はストア初期化を実行しないこと', async () => {
    mockPostTrip.mockRejectedValue(new Error('failed'));

    render(<CreatePlanButton />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    expect(mockResetPlanningStore).not.toHaveBeenCalled();
  });

  it('dirty日付が存在する場合は保存をブロックし、APIを呼ばないこと', async () => {
    mockGetDirtyPlanningDates.mockReturnValue(['2026-06-01']);

    render(<CreatePlanButton />);

    await userEvent.click(screen.getByRole('button', { name: '旅行計画を作成' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    expect(mockPostTrip).not.toHaveBeenCalled();
    expect(mockResetPlanningStore).not.toHaveBeenCalled();
  });
});
