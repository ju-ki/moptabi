import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { TripSummaryCards } from '@/components/mypage/TripSummaryCards';

/**
 * TripSummaryCards テスト
 * 旅行統計カード（訪問済み・行きたい・旅した日数）の表示を検証する
 */
describe('TripSummaryCards', () => {
  describe('統計データがある場合', () => {
    it('訪問済みスポット数が表示されること', () => {
      render(<TripSummaryCards visitedCount={12} wishlistCount={32} totalTripDays={8} />);
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('行きたいスポット数が表示されること', () => {
      render(<TripSummaryCards visitedCount={12} wishlistCount={32} totalTripDays={8} />);
      expect(screen.getByText('32')).toBeInTheDocument();
    });

    it('旅した日数が表示されること', () => {
      render(<TripSummaryCards visitedCount={12} wishlistCount={32} totalTripDays={8} />);
      expect(screen.getByText('8日')).toBeInTheDocument();
    });

    it('「訪問済み」ラベルが表示されること', () => {
      render(<TripSummaryCards visitedCount={12} wishlistCount={32} totalTripDays={8} />);
      expect(screen.getByText('訪問済み')).toBeInTheDocument();
    });

    it('「行きたい」ラベルが表示されること', () => {
      render(<TripSummaryCards visitedCount={12} wishlistCount={32} totalTripDays={8} />);
      expect(screen.getByText('行きたい')).toBeInTheDocument();
    });

    it('「旅した日数」ラベルが表示されること', () => {
      render(<TripSummaryCards visitedCount={12} wishlistCount={32} totalTripDays={8} />);
      expect(screen.getByText('旅した日数')).toBeInTheDocument();
    });

    it('3枚のカードが表示されること', () => {
      render(<TripSummaryCards visitedCount={12} wishlistCount={32} totalTripDays={8} />);
      // grid の直下に3つのCard要素が存在する
      const grid = document.querySelector('.grid.grid-cols-3');
      expect(grid?.children.length).toBe(3);
    });
  });

  describe('データが0の場合', () => {
    it('visitedCountが0の場合「0」が表示されること', () => {
      render(<TripSummaryCards visitedCount={0} wishlistCount={0} totalTripDays={0} />);
      // 訪問済みカード: 「0」、行きたいカード: 「0」、旅した日数カード: 「0日」
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(2); // visitedCount=0 と wishlistCount=0
    });

    it('totalTripDaysが0の場合「0日」が表示されること', () => {
      render(<TripSummaryCards visitedCount={0} wishlistCount={0} totalTripDays={0} />);
      expect(screen.getByText('0日')).toBeInTheDocument();
    });
  });
});
