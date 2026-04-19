import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock constants and helpers
vi.mock('@/data/constants', () => ({
  prefectureCenters: {
    tokyo: { lat: 35.6762, lng: 139.6503 },
  },
  prefectures: ['tokyo'],
}));

const mockSearchSpots = vi.fn();
vi.mock('@/lib/plan', () => ({
  searchSpots: (...args: any[]) => mockSearchSpots(...args),
}));

// Mock child components that AreaSearch renders
vi.mock('@/components/wishlist/SearchResultsView', () => ({
  default: ({ searchResults }: any) => <div data-testid="search-results">{searchResults?.length || 0}</div>,
}));

vi.mock('@/components/wishlist/LocationAdjustModal', () => ({
  default: ({ onConfirm }: any) => (
    <div>
      <button data-testid="confirm-adjust" onClick={() => onConfirm && onConfirm({ lat: 1, lng: 2 })}>
        confirm-adjust
      </button>
    </div>
  ),
}));

// Mock the zustand store. We expose a mutable state object and spy functions.
const setSelectMapOpen = vi.fn();
const setSearchCenter = vi.fn((newCenter) => {
  storeState.searchCenter = newCenter;
});
const setSearchRadius = vi.fn((newRadius) => {
  storeState.searchRadius = newRadius;
});
const setSearchCategories = vi.fn();
const setAreaSearchResults = vi.fn();
const setAreaMapCenter = vi.fn();
const setShowAdvanced = vi.fn((newValue) => {
  storeState.showAdvanced = newValue;
});
const setHighRating = vi.fn((newValue) => {
  storeState.highRating = newValue;
});

let storeState: any;

vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: (selector: any) => {
    return selector ? selector(storeState) : storeState;
  },
}));

import AreaSearch from '@/components/wishlist/AreaSearch';

describe('AreaSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState = {
      mapSelectOpen: false,
      setSelectMapOpen,
      searchCenter: undefined,
      setSearchCenter,
      searchRadius: [5],
      setSearchRadius,
      searchCategories: [],
      setSearchCategories,
      areaSearchResults: [],
      setAreaSearchResults,
      areaMapCenter: { lat: 0, lng: 0 },
      setAreaMapCenter,
      showAdvanced: false,
      setShowAdvanced,
      highRating: false,
      setHighRating,
    };
  });

  describe('初期表示', () => {
    it('エリア検索に必要な項目が全て表示されること', () => {
      render(<AreaSearch />);

      expect(screen.getByTestId('test-location-label')).toBeDefined();
      expect(screen.getByTestId('test-search-range')).toBeDefined();
      expect(screen.getByTestId('test-adjust-label')).toBeDefined();
      expect(screen.getByTestId('test-categories-label')).toBeDefined();

      const searchBtn = screen.getByRole('button', { name: /検索する/ });
      expect(searchBtn).toBeDisabled();
    });
  });

  describe('検索位置の設定', () => {
    it('地図で調整ボタンをクリックした場合モーダルが開くこと', () => {
      render(<AreaSearch />);

      const mapBtn = screen.getByTestId('map-adjust-button');
      fireEvent.click(mapBtn);
      expect(setSelectMapOpen).toHaveBeenCalledWith(true);
    });

    it('場所を設定した状態で地図調整ボタンをクリックした場合setSelectMapOpenが呼ばれること', () => {
      storeState.searchCenter = { lat: 35, lng: 139 };

      render(<AreaSearch />);

      const mapAdjustButton = screen.getByTestId('map-adjust-button');
      fireEvent.click(mapAdjustButton);
      expect(setSelectMapOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('検索条件の入力', () => {
    it('検索範囲スライダーを操作した場合検索範囲が正しく設定されること', async () => {
      storeState.searchRadius = [3];
      const { rerender } = render(<AreaSearch />);
      expect(screen.getByTestId('test-search-range').textContent).toContain('3km');

      const slider = screen.getByTestId('test-search-range-slider');
      expect(slider).toBeDefined();

      fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
      expect(setSearchRadius).toHaveBeenNthCalledWith(1, [2]);
      rerender(<AreaSearch />);

      fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
      expect(setSearchRadius).toHaveBeenNthCalledWith(2, [1]);
      rerender(<AreaSearch />);

      fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
      expect(setSearchRadius).toHaveBeenCalledTimes(2);

      storeState.searchRadius = [8];
      rerender(<AreaSearch />);
      expect(screen.getByTestId('test-search-range').textContent).toContain('8km');

      fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
      expect(setSearchRadius).toHaveBeenNthCalledWith(3, [9]);
      rerender(<AreaSearch />);

      fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
      expect(setSearchRadius).toHaveBeenNthCalledWith(4, [10]);
      rerender(<AreaSearch />);

      fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
      expect(setSearchRadius).toHaveBeenCalledTimes(4);
    });

    it('カテゴリを選択した場合検索条件に設定されること', () => {
      render(<AreaSearch />);

      const category = screen.getByTestId('category-tourist_attraction');
      fireEvent.click(category);
      expect(setSearchCategories).toHaveBeenCalledWith('tourist_attraction');

      fireEvent.click(category);
      expect(setSearchCategories).toHaveBeenCalledTimes(2);
    });

    it('詳細設定を開いた場合評価フィルタリング項目が表示されオンオフを切り替えられること', async () => {
      const { rerender } = render(<AreaSearch />);

      const detailBtn = screen.getByTestId('detail-button');
      fireEvent.click(detailBtn);
      expect(setShowAdvanced).toHaveBeenCalledWith(true);

      rerender(<AreaSearch />);

      expect(screen.getByTestId('test-high-rating-label')).toBeDefined();
      expect(screen.getByTestId('high-rating-checkbox')).toBeDefined();

      const checkbox = screen.getByTestId('high-rating-checkbox');
      fireEvent.click(checkbox);
      expect(setHighRating).toHaveBeenCalled();
    });
  });

  describe('検索実行', () => {
    it('場所を未選択の場合検索条件を入力しても検索ボタンが無効であること', () => {
      render(<AreaSearch />);

      const category = screen.getByTestId('category-tourist_attraction');
      fireEvent.click(category);
      const detailBtn = screen.getByTestId('detail-button');
      fireEvent.click(detailBtn);

      const searchBtn = screen.getByTestId('search-button');
      expect(searchBtn).toBeDisabled();
    });

    it('場所を選択して検索した場合検索結果が取得でき地図中心が更新されること', async () => {
      const fakeResults = [
        { id: 's1', location: { lat: 10, lng: 20 }, rating: 4.5 },
        { id: 's2', location: { lat: 11, lng: 21 }, rating: 3.2 },
      ];

      mockSearchSpots.mockResolvedValueOnce(fakeResults);
      storeState.searchCenter = { lat: 35, lng: 139 };

      render(<AreaSearch />);

      const searchBtn = screen.getByTestId('search-button');
      expect(searchBtn).toBeEnabled();

      fireEvent.click(searchBtn);

      await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

      expect(setAreaSearchResults).toHaveBeenCalledWith(fakeResults);
      expect(setAreaMapCenter).toHaveBeenCalledWith(fakeResults[0].location);
    });

    it('検索条件に合致するデータがある場合は検索結果が表示されること', async () => {
      const fakeResults = [
        { id: 's1', location: { lat: 10, lng: 20 }, rating: 4.5 },
        { id: 's2', location: { lat: 11, lng: 21 }, rating: 3.2 },
      ];

      mockSearchSpots.mockResolvedValueOnce(fakeResults);
      storeState.searchCenter = { lat: 35, lng: 139 };

      render(<AreaSearch />);

      const searchBtn = screen.getByTestId('search-button');
      expect(searchBtn).toBeEnabled();
      fireEvent.click(searchBtn);

      await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

      expect(setAreaSearchResults).toHaveBeenCalledWith(fakeResults);
    });

    it('高評価フィルターが有効の場合評価4以上のスポットのみが結果に表示されること', async () => {
      const mixedResults = [
        { id: 's1', location: { lat: 10, lng: 20 }, rating: 4.5 },
        { id: 's2', location: { lat: 11, lng: 21 }, rating: 3.2 },
        { id: 's3', location: { lat: 12, lng: 22 }, rating: 4.0 },
        { id: 's4', location: { lat: 13, lng: 23 }, rating: null },
      ];

      mockSearchSpots.mockResolvedValueOnce(mixedResults);
      storeState.searchCenter = { lat: 35, lng: 139 };
      storeState.highRating = true;

      render(<AreaSearch />);

      const searchBtn = screen.getByTestId('search-button');
      expect(searchBtn).toBeEnabled();
      fireEvent.click(searchBtn);

      await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

      const expectedFilteredResults = [
        { id: 's1', location: { lat: 10, lng: 20 }, rating: 4.5 },
        { id: 's3', location: { lat: 12, lng: 22 }, rating: 4.0 },
      ];
      expect(setAreaSearchResults).toHaveBeenCalledWith(expectedFilteredResults);
    });

    it('searchSpotsがエラーを返した場合結果はセットされずボタンが再び有効になること', async () => {
      mockSearchSpots.mockRejectedValueOnce(new Error('network error'));
      storeState.searchCenter = { lat: 35, lng: 139 };

      render(<AreaSearch />);

      const searchBtn = screen.getByTestId('search-button');
      expect(searchBtn).toBeEnabled();
      fireEvent.click(searchBtn);

      await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

      expect(setAreaSearchResults).not.toHaveBeenCalled();
      await waitFor(() => expect(searchBtn).toBeEnabled());
    });

    it('検索中は検索ボタンが無効となり完了後に再度有効になること', async () => {
      let resolveFn: any;
      const pending = new Promise((resolve) => {
        resolveFn = resolve;
      });
      mockSearchSpots.mockImplementationOnce(() => pending as any);
      storeState.searchCenter = { lat: 35, lng: 139 };

      render(<AreaSearch />);

      const searchBtn = screen.getByTestId('search-button');
      expect(searchBtn).toBeEnabled();
      fireEvent.click(searchBtn);

      expect(searchBtn).toBeDisabled();

      resolveFn([]);

      await waitFor(() => expect(setAreaSearchResults).toHaveBeenCalled());
      await waitFor(() => expect(searchBtn).toBeEnabled());
    });

    it('検索結果が0件の場合空配列でsetAreaSearchResultsが呼ばれ地図中心は変更されないこと', async () => {
      mockSearchSpots.mockResolvedValueOnce([]);
      storeState.searchCenter = { lat: 35, lng: 139 };

      render(<AreaSearch />);

      const searchBtn = screen.getByTestId('search-button');
      expect(searchBtn).toBeEnabled();
      fireEvent.click(searchBtn);

      await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

      expect(setAreaSearchResults).toHaveBeenCalledWith([]);
      expect(setAreaMapCenter).not.toHaveBeenCalled();
    });
  });
});
