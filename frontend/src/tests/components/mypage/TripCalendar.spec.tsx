import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// useRouter はjsdomでは動作しないためモック化する
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { TripCalendar } from '@/components/mypage/TripCalendar';
import type { TripSummary } from '@/models/mypage';

const defaultDate = new Date('2025-12-01');

const singleDayTrip: TripSummary = {
  id: 1,
  title: '東京散策',
  startDate: '2025-12-10',
  endDate: '2025-12-10',
};

const multiDayTrip: TripSummary = {
  id: 2,
  title: '京都旅行',
  startDate: '2025-12-20',
  endDate: '2025-12-22',
};

const januaryTrip: TripSummary = {
  id: 3,
  title: '沖縄リゾート',
  startDate: '2026-01-05',
  endDate: '2026-01-07',
};

describe('TripCalendar', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('初期表示', () => {
    it('defaultDateの年月ヘッダーが表示されること', () => {
      render(<TripCalendar trips={[]} defaultDate={defaultDate} />);
      expect(screen.getByText('2025年12月')).toBeInTheDocument();
    });

    it('前月ボタンが表示されること', () => {
      render(<TripCalendar trips={[]} defaultDate={defaultDate} />);
      expect(screen.getByRole('button', { name: /前月/ })).toBeInTheDocument();
    });

    it('次月ボタンが表示されること', () => {
      render(<TripCalendar trips={[]} defaultDate={defaultDate} />);
      expect(screen.getByRole('button', { name: /次月/ })).toBeInTheDocument();
    });
  });

  describe('イベント表示', () => {
    it('当月のプランのタイトルが表示されること', () => {
      render(<TripCalendar trips={[singleDayTrip]} defaultDate={defaultDate} />);
      expect(screen.getByText('東京散策')).toBeInTheDocument();
    });

    it('複数日跨ぎのプランが対象期間の各セルに表示されること', () => {
      render(<TripCalendar trips={[multiDayTrip]} defaultDate={defaultDate} />);
      const events = screen.getAllByText('京都旅行');
      expect(events.length).toBe(3);
    });

    it('当月以外のプランは表示されないこと', () => {
      render(<TripCalendar trips={[januaryTrip]} defaultDate={defaultDate} />);
      expect(screen.queryByText('沖縄リゾート')).not.toBeInTheDocument();
    });
  });

  describe('月ナビゲーション', () => {
    it('次月ボタンを押すと翌月のヘッダーが表示されること', () => {
      render(<TripCalendar trips={[]} defaultDate={defaultDate} />);
      fireEvent.click(screen.getByRole('button', { name: /次月/ }));
      expect(screen.getByText('2026年1月')).toBeInTheDocument();
    });

    it('前月ボタンを押すと前月のヘッダーが表示されること', () => {
      render(<TripCalendar trips={[]} defaultDate={defaultDate} />);
      fireEvent.click(screen.getByRole('button', { name: /前月/ }));
      expect(screen.getByText('2025年11月')).toBeInTheDocument();
    });

    it('次月に切り替えると当月のプランは表示されず翌月のプランが表示されること', () => {
      render(<TripCalendar trips={[singleDayTrip, januaryTrip]} defaultDate={defaultDate} />);
      fireEvent.click(screen.getByRole('button', { name: /次月/ }));
      expect(screen.queryByText('東京散策')).not.toBeInTheDocument();
      // 沖縄リゾートは1/5〜1/7の3日間のため複数セルに表示される
      expect(screen.getAllByText('沖縄リゾート').length).toBeGreaterThan(0);
    });
  });

  describe('リンク', () => {
    it('プランのイベントが /plan/:id へのリンクを持つこと', () => {
      render(<TripCalendar trips={[singleDayTrip]} defaultDate={defaultDate} />);
      const link = screen.getAllByRole('link').find((el) => el.getAttribute('href') === '/plan/1');
      expect(link).toBeDefined();
    });
  });
});
