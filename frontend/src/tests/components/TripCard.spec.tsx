import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { TripCard } from '@/components/TripCard';

/**
 * TripCard テスト
 * 旅行情報カードの表示内容を検証する
 */

// next/image はjsdom環境で動作しないためモック化する
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

// next/link はjsdomでは動作しないためモック化する
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

describe('TripCard', () => {
  const defaultProps = {
    id: 'trip-123',
    title: '東京旅行',
    startDate: '2025-12-20',
    endDate: '2025-12-23',
    imageUrl: 'trip-image.jpg',
  };

  describe('初期表示', () => {
    it('タイトルが表示されること', () => {
      render(<TripCard {...defaultProps} />);
      expect(screen.getByText('東京旅行')).toBeInTheDocument();
    });

    it('開始日と終了日が表示されること', () => {
      render(<TripCard {...defaultProps} />);
      expect(screen.getByText('2025/12/20')).toBeInTheDocument();
      expect(screen.getByText('2025/12/23')).toBeInTheDocument();
    });

    it('プラン詳細へのリンクが正しいURLを持つこと', () => {
      render(<TripCard {...defaultProps} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/plan/trip-123');
    });

    it('画像が表示されること', () => {
      render(<TripCard {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', '東京旅行');
    });
  });

  describe('画像なしの場合', () => {
    it('imageUrlがundefinedの場合もレンダリングされること', () => {
      render(<TripCard {...defaultProps} imageUrl={undefined} />);
      expect(screen.getByText('東京旅行')).toBeInTheDocument();
    });
  });

  describe('数値IDの場合', () => {
    it('数値IDのリンクが正しく生成されること', () => {
      render(<TripCard {...defaultProps} id={42} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/plan/42');
    });
  });
});
