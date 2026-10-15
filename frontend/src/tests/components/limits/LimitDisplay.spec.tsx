import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { LimitDisplay } from '@/components/common/LimitDisplay';
import { DEFAULT_USER_LIMITS } from '@shared/user/types';

describe('LimitDisplay コンポーネント', () => {
  describe('行きたいリスト件数表示', () => {
    it('現在の件数と上限が表示される', () => {
      render(<LimitDisplay current={5} limit={DEFAULT_USER_LIMITS.maxWishlistSpots} label="行きたいリスト" />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(`/ ${DEFAULT_USER_LIMITS.maxWishlistSpots}件`)).toBeInTheDocument();
      expect(screen.getByText('行きたいリスト')).toBeInTheDocument();
    });

    it('上限に達している場合は警告スタイルが適用される', () => {
      render(
        <LimitDisplay
          current={DEFAULT_USER_LIMITS.maxWishlistSpots}
          limit={DEFAULT_USER_LIMITS.maxWishlistSpots}
          label="行きたいリスト"
        />,
      );

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-red-600');
    });

    it('上限に近づいている場合（80%以上）は注意スタイルが適用される', () => {
      // limit=20 の 80% = 16件
      render(<LimitDisplay current={16} limit={DEFAULT_USER_LIMITS.maxWishlistSpots} label="行きたいリスト" />);

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-yellow-600');
    });

    it('上限まで余裕がある場合は通常スタイルが適用される', () => {
      // limit=20 の 50% = 10件
      render(<LimitDisplay current={10} limit={DEFAULT_USER_LIMITS.maxWishlistSpots} label="行きたいリスト" />);

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-gray-600');
    });
  });

  describe('プラン作成数表示', () => {
    it('現在のプラン数と上限が表示される', () => {
      render(<LimitDisplay current={3} limit={DEFAULT_USER_LIMITS.maxPlans} label="プラン" />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(`/ ${DEFAULT_USER_LIMITS.maxPlans}件`)).toBeInTheDocument();
    });

    it('プランが上限に達している場合は警告スタイルが適用される', () => {
      render(<LimitDisplay current={20} limit={DEFAULT_USER_LIMITS.maxPlans} label="プラン" />);

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-red-600');
    });
  });

  describe('1日あたりのスポット数表示', () => {
    it('現在のスポット数と上限が表示される', () => {
      render(<LimitDisplay current={5} limit={DEFAULT_USER_LIMITS.maxSpotsPerDay} label="本日のスポット" />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(`/ ${DEFAULT_USER_LIMITS.maxSpotsPerDay}件`)).toBeInTheDocument();
    });

    it('1日のスポットが上限に達している場合は警告スタイルが適用される', () => {
      render(<LimitDisplay current={11} limit={DEFAULT_USER_LIMITS.maxSpotsPerDay} label="本日のスポット" />);

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-red-600');
    });
  });

  describe('日数表示', () => {
    it('現在の日数と上限が表示される', () => {
      render(<LimitDisplay current={3} limit={DEFAULT_USER_LIMITS.maxPlanDays} label="旅行日数" unit="日" />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(`/ ${DEFAULT_USER_LIMITS.maxPlanDays}日`)).toBeInTheDocument();
    });
  });

  describe('サイズ variants', () => {
    it('sm サイズが適用される', () => {
      render(<LimitDisplay current={5} limit={10} label="テスト" size="sm" />);

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-xs');
    });

    it('md サイズが適用される', () => {
      render(<LimitDisplay current={5} limit={10} label="テスト" size="md" />);

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-sm');
    });

    it('lg サイズが適用される', () => {
      render(<LimitDisplay current={5} limit={10} label="テスト" size="lg" />);

      const container = screen.getByTestId('limit-display');
      expect(container).toHaveClass('text-base');
    });
  });
});
