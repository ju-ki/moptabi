import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import WishlistCreateModal from '@/components/wishlist/WishlistCreateModal';

// NextAuthのモック
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react');
  return {
    ...actual,
    useSession: () => ({
      data: {
        user: {
          id: 'test-user-id',
          name: 'テストユーザー',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2099-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
    }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// TestProvidersはそのまま子を返す
const TestProviders = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const renderWithProviders = (ui: React.ReactElement, isLoggedIn = false) => {
  return render(<TestProviders>{ui}</TestProviders>);
};

// useFetchWishlistフックのモック
vi.mock('@/hooks/use-wishlist', () => ({
  useFetchWishlist: () => ({
    data: [],
    isLoading: false,
    error: null,
    postWishlist: vi.fn(),
    updateWishlist: vi.fn(),
    deleteWishlist: vi.fn(),
  }),
}));

vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: vi.fn((selector) => {
    const storeState = {
      selectedSpot: null,
      setSelectedSpot: vi.fn(),
      searchRadius: [5],
      setSearchRadius: vi.fn(),
      searchCategories: [],
      setSearchCategories: vi.fn(),
      areaSearchResults: [],
      setAreaSearchResults: vi.fn(),
      areaMapCenter: null,
      setAreaMapCenter: vi.fn(),
      showAdvanced: false,
      setShowAdvanced: vi.fn(),
      highRating: false,
      setHighRating: vi.fn(),
      mapSelectOpen: false,
      setSelectMapOpen: vi.fn(),
      searchCenter: null,
      setSearchCenter: vi.fn(),
      getSelectedSpot: vi.fn(),
    };
    return typeof selector === 'function' ? selector(storeState) : storeState;
  }),
}));

describe('WishlistCreateModal', () => {
  describe('モーダルの開閉', () => {
    it('スポットを検索ボタンをクリックした場合スポット追加モーダルが開くこと', async () => {
      renderWithProviders(<WishlistCreateModal />);

      const openButton = await screen.findByRole('button', { name: 'スポットを検索' });
      fireEvent.click(openButton);

      expect(await screen.findByText('行きたいスポットを追加')).toBeInTheDocument();
    });
  });

  describe('タブ表示', () => {
    it('初期表示時にエリア検索タブが表示されること', async () => {
      render(<WishlistCreateModal />);

      const openButton = screen.getByLabelText('スポットを検索');
      fireEvent.click(openButton);

      expect(await screen.findByText('エリアから探す')).toBeInTheDocument();
    });

    it('キーワードで探すタブをクリックした場合KeywordSearchWithMapが表示されること', async () => {
      render(<WishlistCreateModal />);

      fireEvent.click(screen.getByLabelText('スポットを検索'));

      const keywordTab = await screen.findByRole('tab', { name: 'キーワードで探す' });
      fireEvent.click(keywordTab);

      expect(await screen.findByText('キーワードで探す')).toBeInTheDocument();
    });
  });
});
