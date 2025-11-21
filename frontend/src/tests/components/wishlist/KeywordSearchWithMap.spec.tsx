import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock plan helper
const mockSearchSpots = vi.fn();
vi.mock('@/lib/plan', () => ({
  searchSpots: (...args: any[]) => mockSearchSpots(...args),
}));

// Mock SearchResultsView to surface the results count
vi.mock('@/components/wishlist/SearchResultsView', () => ({
  default: ({ searchResults }: any) => <div data-testid="search-results">{searchResults?.length || 0}</div>,
}));

// Mock the zustand store used by the component
let storeState: any;
const setKeywordSearchResults = vi.fn((v) => {
  // reflect change into the fake store so a rerender can pick it up
  storeState.keywordSearchResults = v;
});
const setKeywordMapCenter = vi.fn((v) => {
  storeState.keywordMapCenter = v;
});
const setSearchKeyword = vi.fn((v) => {
  storeState.searchKeyword = v;
});

vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: (selector: any) => {
    return selector ? selector(storeState) : storeState;
  },
}));

import KeywordSearchWithMap from '@/components/wishlist/KeywordSearchWithMap';

describe('KeywordSearchWithMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState = {
      keywordSearchResults: [],
      setKeywordSearchResults,
      keywordMapCenter: undefined,
      setKeywordMapCenter,
      searchKeyword: '',
      setSearchKeyword,
    };
  });

  it('レンダリング時に入力とボタンが表示され、初期は無効であること', () => {
    render(<KeywordSearchWithMap />);

    const input = screen.getByPlaceholderText('例: 渋谷 カフェ');
    expect(input).toBeDefined();

    const btn = screen.getByRole('button', { name: /検索/ });
    expect(btn).toBeDisabled();
  });

  it('入力に文字を入れると setSearchKeyword が呼ばれ、ボタンが有効になること', () => {
    const { rerender } = render(<KeywordSearchWithMap />);

    const input = screen.getByPlaceholderText('例: 渋谷 カフェ');
    const btn = screen.getByRole('button', { name: /検索/ });

    fireEvent.change(input, { target: { value: '渋谷' } });
    expect(setSearchKeyword).toHaveBeenCalledWith('渋谷');

    // storeState を操作してレンダリングに反映させるケース
    storeState.searchKeyword = '渋谷';
    // 再レンダーしてボタンが有効になることを検証
    rerender(<KeywordSearchWithMap />);
    expect(screen.getByRole('button', { name: /検索/ })).toBeEnabled();
  });

  it('検索成功時に結果がセットされ、地図中心が最初のスポットに設定されること', async () => {
    const fake = [
      { id: 'k1', location: { lat: 1, lng: 2 }, rating: 4.2 },
      { id: 'k2', location: { lat: 3, lng: 4 }, rating: 3.1 },
    ];
    mockSearchSpots.mockResolvedValueOnce(fake);

    storeState.searchKeyword = '渋谷';

    const { rerender } = render(<KeywordSearchWithMap />);

    const btn = screen.getByRole('button', { name: /検索/ });
    fireEvent.click(btn);

    await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());

    // 第一引数に searchWord が含まれていることを確認
    expect(
      (mockSearchSpots.mock.calls[0] || [])[0]?.searchWord || (mockSearchSpots.mock.calls[0] || [])[0],
    ).toBeDefined();

    expect(setKeywordSearchResults).toHaveBeenCalledWith(fake);
    expect(setKeywordMapCenter).toHaveBeenCalledWith(fake[0].location);

    // storeState に反映した上で再レンダーすると SearchResultsView に結果が表示される
    rerender(<KeywordSearchWithMap />);
    expect(screen.getByTestId('search-results').textContent).toBe('2');
  });

  it('検索中はボタンが無効化され、完了後に再度有効化されること（ローディング）', async () => {
    let resolveFn: any;
    const pending = new Promise((resolve) => {
      resolveFn = resolve;
    });
    mockSearchSpots.mockImplementationOnce(() => pending as any);

    storeState.searchKeyword = '渋谷';
    render(<KeywordSearchWithMap />);

    const btn = screen.getByRole('button', { name: /検索/ });
    fireEvent.click(btn);

    expect(btn).toBeDisabled();

    // 解決して完了
    resolveFn([]);
    await waitFor(() => expect(setKeywordSearchResults).toHaveBeenCalled());
    await waitFor(() => expect(btn).toBeEnabled());
  });

  it('searchSpots がエラーのときは結果がセットされずボタンが再度有効になること', async () => {
    mockSearchSpots.mockRejectedValueOnce(new Error('network'));
    storeState.searchKeyword = '渋谷';

    render(<KeywordSearchWithMap />);

    const btn = screen.getByRole('button', { name: /検索/ });
    fireEvent.click(btn);

    await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());
    expect(setKeywordSearchResults).not.toHaveBeenCalled();
    await waitFor(() => expect(btn).toBeEnabled());
  });

  it('検索結果が0件の場合は空配列がセットされ、地図中心は変更されないこと', async () => {
    mockSearchSpots.mockResolvedValueOnce([]);
    storeState.searchKeyword = '渋谷';

    render(<KeywordSearchWithMap />);

    const btn = screen.getByRole('button', { name: /検索/ });
    fireEvent.click(btn);

    await waitFor(() => expect(mockSearchSpots).toHaveBeenCalled());
    expect(setKeywordSearchResults).toHaveBeenCalledWith([]);
    expect(setKeywordMapCenter).not.toHaveBeenCalled();
  });
});
