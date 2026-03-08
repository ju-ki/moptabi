import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AddressSearch from '@/components/AddressSearch';

// useGeocodingフックをモック
// テスト環境でGoogle Maps APIが利用できないため
vi.mock('@/hooks/use-geocoding', () => ({
  useGeocoding: () => ({
    searchByAddress: vi.fn().mockResolvedValue({
      latitude: 35.6812,
      longitude: 139.7671,
      formattedAddress: '東京都渋谷区渋谷1-1-1',
    }),
    isLoading: false,
    error: null,
  }),
}));

describe('AddressSearch コンポーネント', () => {
  describe('基本表示', () => {
    it('ラベルが表示される', () => {
      render(<AddressSearch label="住所から出発地を検索" onCoordinateFound={vi.fn()} />);

      expect(screen.getByText('住所から出発地を検索')).toBeInTheDocument();
    });

    it('デフォルトラベルが表示される', () => {
      render(<AddressSearch onCoordinateFound={vi.fn()} />);

      expect(screen.getByText('住所から検索')).toBeInTheDocument();
    });

    it('入力フィールドが表示される', () => {
      render(<AddressSearch onCoordinateFound={vi.fn()} />);

      expect(screen.getByTestId('address-search-input')).toBeInTheDocument();
    });

    it('検索ボタンが表示される', () => {
      render(<AddressSearch onCoordinateFound={vi.fn()} />);

      expect(screen.getByTestId('address-search-button')).toBeInTheDocument();
    });

    it('カスタムプレースホルダーが表示される', () => {
      render(<AddressSearch placeholder="住所を入力してください" onCoordinateFound={vi.fn()} />);

      expect(screen.getByPlaceholderText('住所を入力してください')).toBeInTheDocument();
    });
  });

  describe('入力操作', () => {
    it('住所を入力できる', async () => {
      const user = userEvent.setup();

      render(<AddressSearch onCoordinateFound={vi.fn()} />);

      const input = screen.getByTestId('address-search-input');
      await user.type(input, '東京都渋谷区');

      expect(input).toHaveValue('東京都渋谷区');
    });

    it('入力なしの場合、検索ボタンが無効になる', () => {
      render(<AddressSearch onCoordinateFound={vi.fn()} />);

      const button = screen.getByTestId('address-search-button');
      expect(button).toBeDisabled();
    });

    it('入力がある場合、検索ボタンが有効になる', async () => {
      const user = userEvent.setup();

      render(<AddressSearch onCoordinateFound={vi.fn()} />);

      const input = screen.getByTestId('address-search-input');
      await user.type(input, '東京都渋谷区');

      const button = screen.getByTestId('address-search-button');
      expect(button).not.toBeDisabled();
    });
  });
});
