import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Transportation テスト
 * 移動手段の複数選択（チェックボックス）ロジックを検証する
 */

const mockSetPlanningInfo = vi.fn();
const mockGetPlanningInfo = vi.fn();

// useStoreForPlanning はストアへのアクセスを行うため、モックで代替する
vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

import { useStoreForPlanning } from '@/lib/plan';
import Transportation from '@/components/Transportation';

const createMockFields = (
  overrides: Partial<{
    transportationMethodId: number[];
    tripInfoErrors: Record<string, { transportationMethod?: string }> | null;
  }> = {},
) => ({
  getPlanningInfo: mockGetPlanningInfo.mockReturnValue({
    transportationMethodId: overrides.transportationMethodId ?? [],
  }),
  setPlanningInfo: mockSetPlanningInfo,
  tripInfoErrors: overrides.tripInfoErrors ?? null,
});

describe('Transportation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('全ての移動手段のチェックボックスが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByLabelText('徒歩')).toBeInTheDocument();
      expect(screen.getByLabelText('車')).toBeInTheDocument();
      expect(screen.getByLabelText('自転車')).toBeInTheDocument();
    });

    it('初期表示時は全て未選択であること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethodId: [] }));
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByLabelText('徒歩')).not.toBeChecked();
      expect(screen.getByLabelText('車')).not.toBeChecked();
      expect(screen.getByLabelText('自転車')).not.toBeChecked();
    });

    it('未選択の場合は徒歩が選択されますという注意書きが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByText('未選択の場合は徒歩が選択されます')).toBeInTheDocument();
    });
  });

  describe('移動手段のクリック（単一）', () => {
    it('チェックがoffの移動手段をクリックするとチェックボックスがonになること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethodId: [] }));
      render(<Transportation date="2025-12-20" />);

      fireEvent.click(screen.getByLabelText('徒歩'));

      expect(mockSetPlanningInfo).toHaveBeenCalledWith('2025-12-20', {
        transportationMethodId: [1],
      });
    });

    it('チェックがonの移動手段をクリックするとチェックボックスがoffになること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethodId: [1] }));
      render(<Transportation date="2025-12-20" />);

      fireEvent.click(screen.getByLabelText('徒歩'));

      expect(mockSetPlanningInfo).toHaveBeenCalledWith('2025-12-20', {
        transportationMethodId: [],
      });
    });
  });

  describe('移動手段のクリック（複数）', () => {
    it('チェックがoffの移動手段をクリックしても他の移動手段のチェック状態に影響が出ないこと', () => {
      // 徒歩(1)が選択済みの状態で車(2)を追加する
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethodId: [1] }));
      render(<Transportation date="2025-12-20" />);

      fireEvent.click(screen.getByLabelText('車'));

      // 徒歩(1)を含めた配列で更新されること
      expect(mockSetPlanningInfo).toHaveBeenCalledWith('2025-12-20', {
        transportationMethodId: [1, 3],
      });
    });

    it('チェックがonの移動手段をクリックしても他の移動手段のチェック状態に影響が出ないこと', () => {
      // 徒歩(1)・車(3)が選択済みの状態で車(3)をオフにする
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethodId: [1, 3] }));
      render(<Transportation date="2025-12-20" />);

      fireEvent.click(screen.getByLabelText('車'));

      // 徒歩(1)が残った配列で更新されること
      expect(mockSetPlanningInfo).toHaveBeenCalledWith('2025-12-20', {
        transportationMethodId: [1],
      });
    });
  });
});
