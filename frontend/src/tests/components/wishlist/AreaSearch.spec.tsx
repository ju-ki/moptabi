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

  it('エリア検索に必要な項目が全て表示されていること', () => {
    render(<AreaSearch />);

    expect(screen.getByTestId('test-location-label')).toBeDefined();
    expect(screen.getByTestId('test-search-range')).toBeDefined();
    expect(screen.getByTestId('test-adjust-label')).toBeDefined();
    expect(screen.getByTestId('test-categories-label')).toBeDefined();

    const searchBtn = screen.getByRole('button', { name: /検索する/ });
    expect(searchBtn).toBeDisabled();
  });

  it('地図で調整ボタンを押下することで現在選択されている場所のモーダルが表示される', () => {
    render(<AreaSearch />);

    const mapBtn = screen.getByTestId('map-adjust-button');
    fireEvent.click(mapBtn);
    expect(setSelectMapOpen).toHaveBeenCalledWith(true);
  });

  it('都道府県のセレクトボックスを選択することで、期待通りのLocationで検索条件に設定されていること', async () => {
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

  it('検索範囲のスライダーが期待通りの範囲で、検索条件に設定できること', async () => {
    storeState.searchRadius = [3];
    const { rerender } = render(<AreaSearch />);
    expect(screen.getByTestId('test-search-range').textContent).toContain('3km');

    const slider = screen.getByTestId('test-search-range-slider');
    expect(slider).toBeDefined();

    // ArrowLeft from [3] should go to [2]
    fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(setSearchRadius).toHaveBeenNthCalledWith(1, [2]);
    rerender(<AreaSearch />);

    // ArrowLeft from [2] should go to [1]
    fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(setSearchRadius).toHaveBeenNthCalledWith(2, [1]);
    rerender(<AreaSearch />);

    // ArrowLeft from [1] should stay at [1] (no callback triggered because value doesn't change)
    fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(setSearchRadius).toHaveBeenCalledTimes(2);

    storeState.searchRadius = [8];
    rerender(<AreaSearch />);
    expect(screen.getByTestId('test-search-range').textContent).toContain('8km');

    // ArrowRight from [8] should go to [9]
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(setSearchRadius).toHaveBeenNthCalledWith(3, [9]);
    rerender(<AreaSearch />);

    // ArrowRight from [9] should go to [10]
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(setSearchRadius).toHaveBeenNthCalledWith(4, [10]);
    rerender(<AreaSearch />);

    // ArrowRight from [10] should stay at [10] (no callback triggered because value doesn't change)
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(setSearchRadius).toHaveBeenCalledTimes(4);
  });

  it('検索位置を調整のボタンを押下することで場所選択で設定した、Locationを中心としたマップが表示されること', async () => {
    storeState.searchCenter = { lat: 35, lng: 139 };

    render(<AreaSearch />);

    const mapAdjustButton = screen.getByTestId('map-adjust-button');
    fireEvent.click(mapAdjustButton);
    expect(setSelectMapOpen).toHaveBeenCalledWith(true);
  });

  it('カテゴリが単数から複数件選択でき、期待通りに検索条件に設定できること', () => {
    render(<AreaSearch />);

    const category = screen.getByTestId('category-tourist_attraction');
    fireEvent.click(category);
    expect(setSearchCategories).toHaveBeenCalledWith('tourist_attraction');

    fireEvent.click(category);
    expect(setSearchCategories).toHaveBeenCalledTimes(2);
  });

  it('詳細設定の項目を押下することで、評価のフィルタリングの項目が表示され、ON/OFFを切り替えることができること', async () => {
    const { rerender } = render(<AreaSearch />);

    const detailBtn = screen.getByTestId('detail-button');
    fireEvent.click(detailBtn);
    expect(setShowAdvanced).toHaveBeenCalledWith(true);

    // Re-render after state change
    rerender(<AreaSearch />);

    expect(screen.getByTestId('test-high-rating-label')).toBeDefined();
    expect(screen.getByTestId('high-rating-checkbox')).toBeDefined();

    const checkbox = screen.getByTestId('high-rating-checkbox');
    fireEvent.click(checkbox);
    expect(setHighRating).toHaveBeenCalled();
  });

  it('場所選択するまでは、どの検索条件を入力しても検索ボタンを押下できないこと', async () => {
    render(<AreaSearch />);

    const category = screen.getByTestId('category-tourist_attraction');
    fireEvent.click(category);
    const detailBtn = screen.getByTestId('detail-button');
    fireEvent.click(detailBtn);

    const searchBtn = screen.getByTestId('search-button');
    expect(searchBtn).toBeDisabled();
  });

  it('検索条件に合致するデータがある場合は、検索結果が表示されること', async () => {
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

  it('検索条件でフィルターがかかり、評価4以上のスポットのみが検索結果に表示されること', async () => {
    const mixedResults = [
      { id: 's1', location: { lat: 10, lng: 20 }, rating: 4.5 },
      { id: 's2', location: { lat: 11, lng: 21 }, rating: 3.2 },
      { id: 's3', location: { lat: 12, lng: 22 }, rating: 4.0 },
      { id: 's4', location: { lat: 13, lng: 23 }, rating: null },
    ];

    mockSearchSpots.mockResolvedValueOnce(mixedResults);

    storeState.searchCenter = { lat: 35, lng: 139 };
    storeState.highRating = true; // Enable high rating filter

    render(<AreaSearch />);

    const searchBtn = screen.getByTestId('search-button');
    expect(searchBtn).toBeEnabled();
    fireEvent.click(searchBtn);

    await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

    // Only spots with rating >= 4 should be in the final results
    const expectedFilteredResults = [
      { id: 's1', location: { lat: 10, lng: 20 }, rating: 4.5 },
      { id: 's3', location: { lat: 12, lng: 22 }, rating: 4.0 },
    ];
    expect(setAreaSearchResults).toHaveBeenCalledWith(expectedFilteredResults);
  });

  it('searchSpots がエラーを返した場合、結果はセットされずボタンは再び有効になること', async () => {
    mockSearchSpots.mockRejectedValueOnce(new Error('network error'));

    storeState.searchCenter = { lat: 35, lng: 139 };

    render(<AreaSearch />);

    const searchBtn = screen.getByTestId('search-button');
    expect(searchBtn).toBeEnabled();

    fireEvent.click(searchBtn);

    // API は呼ばれるが、例外のため setAreaSearchResults は呼ばれない
    await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

    expect(setAreaSearchResults).not.toHaveBeenCalled();

    // エラー後、検索ボタンは再び有効になるはず
    await waitFor(() => expect(searchBtn).toBeEnabled());
  });

  it('検索中は検索ボタンが無効化され、完了後に再度有効化されること（ローディング状態）', async () => {
    // 解決に少し時間のかかる Promise を返す
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

    // リクエスト発行直後はボタンが無効化されている
    expect(searchBtn).toBeDisabled();

    // Promise を解決して完了させる
    resolveFn([]);

    await waitFor(() => expect(setAreaSearchResults).toHaveBeenCalled());

    // 完了後はボタンが再び有効
    await waitFor(() => expect(searchBtn).toBeEnabled());
  });

  it('検索結果が0件の場合、空配列で setAreaSearchResults が呼ばれ、地図中心は変更されないこと', async () => {
    mockSearchSpots.mockResolvedValueOnce([]);

    storeState.searchCenter = { lat: 35, lng: 139 };

    render(<AreaSearch />);

    const searchBtn = screen.getByTestId('search-button');
    expect(searchBtn).toBeEnabled();

    fireEvent.click(searchBtn);

    await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

    expect(setAreaSearchResults).toHaveBeenCalledWith([]);
    // 結果が空なので地図中心の更新は行われない
    expect(setAreaMapCenter).not.toHaveBeenCalled();
  });
});
