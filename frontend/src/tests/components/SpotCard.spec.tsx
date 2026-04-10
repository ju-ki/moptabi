import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import SpotCard from '@/components/SpotCard';

/**
 * SpotCard テスト
 * スポット情報カードの表示内容を検証する
 */

// next/image はjsdom環境で動作しないためモック化する
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

// next/link はjsdomでは動作しないためモック化する
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('SpotCard', () => {
  const spotWithPhotos = {
    id: 'spot-1',
    name: '東京タワー',
    url: 'https://example.com/tokyo-tower',
    location: { id: 'spot-1', lat: 35.6586, lng: 139.7454, name: '東京タワー' },
    photos: [
      { flagContentURI: 'https://example.com/photo1.jpg' },
      { flagContentURI: 'https://example.com/photo2.jpg' },
    ],
  };

  const spotWithoutPhotos = {
    id: 'spot-2',
    name: '上野公園',
    url: 'https://example.com/ueno',
    location: { id: 'spot-2', lat: 35.7148, lng: 139.7731, name: '上野公園' },
    photos: [],
  };

  describe('初期表示', () => {
    it('スポット名が表示されること', () => {
      render(<SpotCard spot={spotWithPhotos} />);
      expect(screen.getByText('東京タワー')).toBeInTheDocument();
    });

    it('詳細へのリンクが表示されること', () => {
      render(<SpotCard spot={spotWithPhotos} />);
      const link = screen.getByRole('link', { name: '詳細へ' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com/tokyo-tower');
    });
  });

  describe('写真の表示', () => {
    it('写真がある場合は最初の1枚のみ表示されること', () => {
      render(<SpotCard spot={spotWithPhotos} />);
      const images = screen.getAllByRole('img');
      // 最初の写真のみ表示（Fragmentで残りはスキップ）
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute('src', 'https://example.com/photo1.jpg');
    });

    it('写真がない場合は「No photos available」が表示されること', () => {
      render(<SpotCard spot={spotWithoutPhotos} />);
      expect(screen.getByText('No photos available')).toBeInTheDocument();
    });
  });
});
