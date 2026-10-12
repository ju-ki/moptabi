import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// next/link はjsdomでは動作しないためモック化する
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

// TripCalendar は描画のみ確認するためモック化する
vi.mock('@/components/mypage/TripCalendar', () => ({
  TripCalendar: () => <div data-testid="trip-calendar" />,
}));

import { TripScheduleSection } from '@/components/mypage/TripScheduleSection';
import type { NextTrip, TripSummary } from '@/models/mypage';

const defaultCalendarDate = new Date('2025-12-01');
const emptyTrips: TripSummary[] = [];

const makeNextTrip = (id: number, title: string, daysUntil: number): NextTrip => ({
  id,
  title,
  startDate: '2025-12-20',
  endDate: '2025-12-22',
  daysUntil,
});

describe('TripScheduleSection', () => {
  describe('次の旅がない場合', () => {
    it('「旅を計画しよう」ヘッダーが表示されること', () => {
      render(
        <TripScheduleSection
          nextTrips={[]}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.getByText('旅を計画しよう')).toBeInTheDocument();
    });

    it('「次の旅を計画しませんか？」メッセージが表示されること', () => {
      render(
        <TripScheduleSection
          nextTrips={[]}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.getByText('次の旅を計画しませんか？')).toBeInTheDocument();
    });

    it('プラン作成ページ（/plan/create）へのリンクが表示されること', () => {
      render(
        <TripScheduleSection
          nextTrips={[]}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      const link = screen.getByRole('link', { name: 'プランを作成する' });
      expect(link).toHaveAttribute('href', '/plan/create');
    });

    it('wishlistCountが1以上の場合ウィッシュリスト件数が表示されること', () => {
      render(
        <TripScheduleSection
          nextTrips={[]}
          wishlistCount={8}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.getByText(/8件のスポット/)).toBeInTheDocument();
    });

    it('wishlistCountが0の場合ウィッシュリスト件数テキストが表示されないこと', () => {
      render(
        <TripScheduleSection
          nextTrips={[]}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.queryByText(/のスポット/)).not.toBeInTheDocument();
    });
  });

  describe('次の旅がある場合', () => {
    it('「次の旅」ヘッダーが表示されること', () => {
      render(
        <TripScheduleSection
          nextTrips={[makeNextTrip(1, '京都旅行', 14)]}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.getByText('次の旅')).toBeInTheDocument();
    });

    it('プランのタイトル・出発日・あと何日・詳細リンクが表示されること', () => {
      render(
        <TripScheduleSection
          nextTrips={[makeNextTrip(1, '京都旅行', 14)]}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.getByText('京都旅行')).toBeInTheDocument();
      expect(screen.getByText('2025-12-20')).toBeInTheDocument();
      expect(screen.getByText('あと14日')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: '詳細を見る' });
      expect(link).toHaveAttribute('href', '/plan/1');
    });

    it('nextTripsが3件の場合3件のタイトルがすべて表示されること', () => {
      const trips = [makeNextTrip(1, '京都旅行', 14), makeNextTrip(2, '大阪旅行', 30), makeNextTrip(3, '沖縄旅行', 60)];
      render(
        <TripScheduleSection
          nextTrips={trips}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.getByText('京都旅行')).toBeInTheDocument();
      expect(screen.getByText('大阪旅行')).toBeInTheDocument();
      expect(screen.getByText('沖縄旅行')).toBeInTheDocument();
    });
  });

  describe('カレンダー表示', () => {
    it('TripCalendarコンポーネントが描画されること', () => {
      render(
        <TripScheduleSection
          nextTrips={[]}
          wishlistCount={0}
          trips={emptyTrips}
          defaultCalendarDate={defaultCalendarDate}
        />,
      );
      expect(screen.getByTestId('trip-calendar')).toBeInTheDocument();
    });
  });
});
