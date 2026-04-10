import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// next/link はjsdomでは動作しないためモック化する
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { RecentTrips } from '@/components/mypage/RecentTrips';

/**
 * RecentTrips テスト
 * 最近の旅一覧の表示・空状態の表示を検証する
 */
describe('RecentTrips', () => {
  describe('旅行履歴がある場合', () => {
    const trips = [
      { id: 1, title: '東京散策', startDate: '2024-12-10' },
      { id: 2, title: '大阪旅行', startDate: '2024-11-15' },
      { id: 3, title: '沖縄リゾート', startDate: '2024-10-01' },
    ];

    it('旅行タイトルが一覧で表示されること', () => {
      render(<RecentTrips trips={trips} />);
      expect(screen.getByText('東京散策')).toBeInTheDocument();
      expect(screen.getByText('大阪旅行')).toBeInTheDocument();
      expect(screen.getByText('沖縄リゾート')).toBeInTheDocument();
    });

    it('出発日が表示されること', () => {
      render(<RecentTrips trips={trips} />);
      expect(screen.getByText('2024-12-10')).toBeInTheDocument();
    });

    it('「最近の旅」というヘッダーが表示されること', () => {
      render(<RecentTrips trips={trips} />);
      expect(screen.getByText('最近の旅')).toBeInTheDocument();
    });

    it('すべて見るリンクがプランリストページを指すこと', () => {
      render(<RecentTrips trips={trips} />);
      const link = screen.getByRole('link', { name: /すべて見る/ });
      expect(link).toHaveAttribute('href', '/plan/list');
    });
  });

  describe('旅行履歴がない場合', () => {
    it('「まだ旅の記録がありません」メッセージが表示されること', () => {
      render(<RecentTrips trips={[]} />);
      expect(screen.getByText('まだ旅の記録がありません')).toBeInTheDocument();
    });

    it('空状態の場合すべて見るリンクが表示されないこと', () => {
      render(<RecentTrips trips={[]} />);
      expect(screen.queryByRole('link', { name: /すべて見る/ })).not.toBeInTheDocument();
    });
  });
});
