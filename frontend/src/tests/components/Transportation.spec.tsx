import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Transportation テスト
 * 移動手段の表示・選択ロジックを検証する
 */

const mockSetTripInfo = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

import { useStoreForPlanning } from '@/lib/plan';
import Transportation from '@/components/Transportation';

const createMockFields = (
  overrides: Partial<{
    transportationMethod: number | undefined;
    tripInfoErrors: Record<string, { transportationMethod?: string }> | null;
  }> = {},
) => ({
  tripInfo: [
    {
      date: '2025-12-20',
      transportationMethod: overrides.transportationMethod,
    },
  ],
  setTripInfo: mockSetTripInfo,
  tripInfoErrors: overrides.tripInfoErrors ?? null,
});

describe('Transportation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('移動手段の表示', () => {
    it('すべての移動手段のラジオボタンが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByLabelText('徒歩')).toBeInTheDocument();
      expect(screen.getByLabelText('車')).toBeInTheDocument();
      expect(screen.getByLabelText('自転車')).toBeInTheDocument();
    });

    it('移動手段が未選択の場合いずれのラジオボタンもチェックされていないこと', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethod: undefined }));
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByLabelText('徒歩')).not.toBeChecked();
      expect(screen.getByLabelText('車')).not.toBeChecked();
      expect(screen.getByLabelText('自転車')).not.toBeChecked();
    });

    it('移動手段が徒歩（id:1）の場合徒歩ラジオボタンがチェックされること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethod: 1 }));
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByLabelText('徒歩')).toBeChecked();
      expect(screen.getByLabelText('車')).not.toBeChecked();
    });

    it('移動手段が車（id:2）の場合車ラジオボタンがチェックされること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethod: 2 }));
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByLabelText('車')).toBeChecked();
      expect(screen.getByLabelText('徒歩')).not.toBeChecked();
    });
  });

  describe('移動手段の変更', () => {
    it('徒歩ラジオボタンを選択するとsetTripInfoが呼ばれること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethod: 2 }));
      render(<Transportation date="2025-12-20" />);

      fireEvent.click(screen.getByLabelText('徒歩'));

      expect(mockSetTripInfo).toHaveBeenCalledWith('2025-12-20', 'transportationMethod', 1);
    });

    it('自転車ラジオボタンを選択するとsetTripInfoが呼ばれること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ transportationMethod: 1 }));
      render(<Transportation date="2025-12-20" />);

      fireEvent.click(screen.getByLabelText('自転車'));

      expect(mockSetTripInfo).toHaveBeenCalledWith('2025-12-20', 'transportationMethod', 3);
    });
  });

  describe('バリデーションエラー', () => {
    it('エラーがある場合エラーメッセージが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          tripInfoErrors: { '2025-12-20': { transportationMethod: '移動手段を選択してください' } },
        }),
      );
      render(<Transportation date="2025-12-20" />);

      expect(screen.getByText('移動手段を選択してください')).toBeInTheDocument();
    });

    it('エラーがない場合エラーメッセージが表示されないこと', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields({ tripInfoErrors: null }));
      render(<Transportation date="2025-12-20" />);

      // エラーテキストが存在しないことを確認
      const errorEl = screen.queryByText('移動手段を選択してください');
      expect(errorEl).not.toBeInTheDocument();
    });
  });
});
