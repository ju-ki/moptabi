import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// next/link はjsdomでは動作しないためモック化する
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { NextTripSection } from '@/components/mypage/NextTripSection';

/**
 * NextTripSection テスト
 * 次の旅程の表示・データなし時の空状態を検証する
 */
describe('NextTripSection', () => {
  describe('次の旅程がある場合', () => {
    const nextTrip = {
      id: 1,
      title: '京都旅行',
      startDate: '2025-12-20',
      daysUntil: 14,
    };

    it('旅程タイトルが表示されること', () => {
      render(<NextTripSection nextTrip={nextTrip} wishlistCount={5} />);
      expect(screen.getByText('京都旅行')).toBeInTheDocument();
    });

    it('出発日が表示されること', () => {
      render(<NextTripSection nextTrip={nextTrip} wishlistCount={5} />);
      expect(screen.getByText('2025-12-20')).toBeInTheDocument();
    });

    it('あと何日かが表示されること', () => {
      render(<NextTripSection nextTrip={nextTrip} wishlistCount={5} />);
      expect(screen.getByText('あと14日')).toBeInTheDocument();
    });

    it('「次の旅」というヘッダーが表示されること', () => {
      render(<NextTripSection nextTrip={nextTrip} wishlistCount={5} />);
      expect(screen.getByText('次の旅')).toBeInTheDocument();
    });

    it('詳細を見るリンクがプランIDのURLを持つこと', () => {
      render(<NextTripSection nextTrip={nextTrip} wishlistCount={5} />);
      const link = screen.getByRole('link', { name: '詳細を見る' });
      expect(link).toHaveAttribute('href', '/plan/1');
    });
  });

  describe('次の旅程がない場合', () => {
    it('「旅を計画しよう」というヘッダーが表示されること', () => {
      render(<NextTripSection nextTrip={null} wishlistCount={0} />);
      expect(screen.getByText('旅を計画しよう')).toBeInTheDocument();
    });

    it('「次の旅を計画しませんか？」メッセージが表示されること', () => {
      render(<NextTripSection nextTrip={null} wishlistCount={0} />);
      expect(screen.getByText('次の旅を計画しませんか？')).toBeInTheDocument();
    });

    it('プラン作成ページへのリンクが表示されること', () => {
      render(<NextTripSection nextTrip={null} wishlistCount={0} />);
      const link = screen.getByRole('link', { name: 'プランを作成する' });
      expect(link).toHaveAttribute('href', '/plan/create');
    });

    it('行きたいリストに件数がある場合その件数が表示されること', () => {
      render(<NextTripSection nextTrip={null} wishlistCount={8} />);
      expect(screen.getByText(/8件のスポット/)).toBeInTheDocument();
    });

    it('行きたいリストが0件の場合スポット件数テキストが表示されないこと', () => {
      render(<NextTripSection nextTrip={null} wishlistCount={0} />);
      expect(screen.queryByText(/のスポット/)).not.toBeInTheDocument();
    });
  });
});
