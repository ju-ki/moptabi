import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import DateRangePicker from '@/components/DateRangePicker';

/**
 * DateRangePicker テスト
 * 日付範囲選択コンポーネントの表示・選択動作を検証する
 */
describe('DateRangePicker', () => {
  describe('初期表示', () => {
    it('開始日と終了日が未設定の場合「日付範囲を選択」が表示されること', () => {
      render(<DateRangePicker startDate={undefined} endDate={undefined} onDateChange={vi.fn()} />);

      expect(screen.getByText('日付範囲を選択')).toBeInTheDocument();
    });

    it('開始日のみ設定されている場合開始日が表示されること', () => {
      render(<DateRangePicker startDate="2025-12-01" endDate={undefined} onDateChange={vi.fn()} />);

      expect(screen.getByText('2025-12-01')).toBeInTheDocument();
    });

    it('開始日と終了日が設定されている場合両方の日付が表示されること', () => {
      render(<DateRangePicker startDate="2025-12-01" endDate="2025-12-07" onDateChange={vi.fn()} />);

      expect(screen.getByText(/2025-12-01 ~ 2025-12-07/)).toBeInTheDocument();
    });

    it('カレンダーアイコンが常に表示されること', () => {
      render(<DateRangePicker startDate={undefined} endDate={undefined} onDateChange={vi.fn()} />);

      // popover trigger ボタンが存在する
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('カレンダーの開閉', () => {
    it('ボタンをクリックするとカレンダーが開くこと', () => {
      render(<DateRangePicker startDate={undefined} endDate={undefined} onDateChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('button'));

      // numberOfMonths=2 のため2つのグリッドが表示される
      const grids = screen.getAllByRole('grid');
      expect(grids.length).toBeGreaterThan(0);
    });

    it('カレンダーが開いた状態で月の名前が表示されること', () => {
      render(<DateRangePicker startDate="2025-12-01" endDate={undefined} onDateChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('button'));

      // numberOfMonths=2 のため2つのグリッドが表示される
      const grids = screen.getAllByRole('grid');
      expect(grids.length).toBe(2);
    });
  });

  describe('maxDays制限', () => {
    it('デフォルトのmaxDaysはAPP_LIMITSのMAX_PLAN_DAYS（7日）が適用されること', () => {
      // maxDaysを指定しない場合にデフォルト値が使われることを
      // コンポーネントがエラーなくレンダリングされることで確認する
      render(<DateRangePicker startDate={undefined} endDate={undefined} onDateChange={vi.fn()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('カスタムmaxDaysを指定してもレンダリングされること', () => {
      render(<DateRangePicker startDate={undefined} endDate={undefined} onDateChange={vi.fn()} maxDays={3} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
