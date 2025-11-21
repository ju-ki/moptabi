import WishlistHeader from '@/components/wishlist/Header';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prepare mocks for the zustand store used by Header
const setViewModeMock = vi.fn();
const setPriorityFilterMock = vi.fn();
const setRatingFilterMock = vi.fn();
const setFilteredTypeMock = vi.fn();
const getViewModeMock = vi.fn(() => 'list');
const getFilteredTypeMock = vi.fn(() => 'all');

vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: () => ({
    getViewMode: getViewModeMock,
    setViewMode: setViewModeMock,
    getFilteredType: getFilteredTypeMock,
    setFilteredType: setFilteredTypeMock,
    setPriorityFilter: setPriorityFilterMock,
    setRatingFilter: setRatingFilterMock,
    // other functions used by header may be present but are not needed for these tests
  }),
}));

// Import component after mocking so it receives the mocked store

describe('行きたいリストのヘッダーのテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ensure getViewMode returns 'list' by default for each test
    getViewModeMock.mockReturnValue('list');
    getFilteredTypeMock.mockReturnValue('all');
  });

  it('タイトルとビュー切り替えボタンが表示されること', () => {
    render(<WishlistHeader />);

    // Title
    expect(screen.getByText('行きたいリスト')).toBeDefined();

    // Buttons by aria-label
    expect(screen.getByLabelText('リストビューに切り替え')).toBeDefined();
    expect(screen.getByLabelText('マップビューに切り替え')).toBeDefined();
  });

  it('ビュー切り替えボタンをクリックするとsetViewModeが正しい値で呼ばれること', () => {
    render(<WishlistHeader />);

    const listBtn = screen.getByLabelText('リストビューに切り替え');
    const mapBtn = screen.getByLabelText('マップビューに切り替え');

    fireEvent.click(mapBtn);
    expect(setViewModeMock).toHaveBeenCalledWith('map');

    fireEvent.click(listBtn);
    expect(setViewModeMock).toHaveBeenCalledWith('list');
  });

  it('優先度と評価のセレクトを変更すると対応するストアのSetterが呼ばれること', () => {
    render(<WishlistHeader />);

    const prioritySelect = screen.getByLabelText('優先度');
    const ratingSelect = screen.getByLabelText('評価');
    // change rating to 1
    fireEvent.change(ratingSelect, { target: { value: '1' } });
    expect(setRatingFilterMock).toHaveBeenCalledWith(1);
    // change rating to 5
    fireEvent.change(ratingSelect, { target: { value: '5' } });
    expect(setRatingFilterMock).toHaveBeenCalledWith(5);

    // change priority to 1
    fireEvent.change(prioritySelect, { target: { value: '1' } });
    expect(setPriorityFilterMock).toHaveBeenCalledWith(1);
    // change priority to 5
    fireEvent.change(prioritySelect, { target: { value: '5' } });
    expect(setPriorityFilterMock).toHaveBeenCalledWith(5);
  });

  it('フィルタータイプのボタンをクリックするとsetFilteredTypeが呼ばれること', () => {
    render(<WishlistHeader />);

    const unvisitedBtn = screen.getByText('未訪問');
    const visitedBtn = screen.getByText('訪問済み');

    fireEvent.click(unvisitedBtn);
    expect(setFilteredTypeMock).toHaveBeenCalledWith('unvisited');

    fireEvent.click(visitedBtn);
    expect(setFilteredTypeMock).toHaveBeenCalledWith('visited');
  });

  it('ビュー切り替え後、フィルターの状態が維持されていること', () => {
    getFilteredTypeMock.mockReturnValue('unvisited');
    render(<WishlistHeader />);

    const unvisitedBtn = screen.getByLabelText('未訪問フィルター');
    fireEvent.click(unvisitedBtn);
    expect(setFilteredTypeMock).toHaveBeenCalledWith('unvisited');

    const mapBtn = screen.getByLabelText('マップビューに切り替え');
    fireEvent.click(mapBtn);
    expect(setViewModeMock).toHaveBeenCalledWith('map');

    expect(setFilteredTypeMock).toHaveBeenCalledWith('unvisited');

    const visitedBtn = screen.getByLabelText('訪問済みフィルター');
    fireEvent.click(visitedBtn);
    expect(setFilteredTypeMock).toHaveBeenCalledWith('visited');
    const listBtn = screen.getByLabelText('リストビューに切り替え');
    fireEvent.click(listBtn);
    expect(setViewModeMock).toHaveBeenCalledWith('list');

    expect(setFilteredTypeMock).toHaveBeenCalledWith('visited');
  });

  it('ビュー切り替え後、優先度と評価の状態が維持されていること', () => {
    render(<WishlistHeader />);

    const prioritySelect = screen.getByLabelText('優先度');
    const ratingSelect = screen.getByLabelText('評価');

    // 優先度と評価値のフィルターを設定
    fireEvent.change(prioritySelect, { target: { value: '3' } });
    expect(setPriorityFilterMock).toHaveBeenCalledWith(3);
    fireEvent.change(ratingSelect, { target: { value: '4' } });
    expect(setRatingFilterMock).toHaveBeenCalledWith(4);

    // マップビューに切り替え
    const mapBtn = screen.getByLabelText('マップビューに切り替え');
    fireEvent.click(mapBtn);
    expect(setViewModeMock).toHaveBeenCalledWith('map');

    // フィルターが維持されていることを確認
    expect(setPriorityFilterMock).toHaveBeenCalledWith(3);
    expect(setRatingFilterMock).toHaveBeenCalledWith(4);

    // リストビューに切り替え
    const listBtn = screen.getByLabelText('リストビューに切り替え');
    fireEvent.click(listBtn);
    expect(setViewModeMock).toHaveBeenCalledWith('list');

    // フィルターが引き続き維持されていることを確認
    expect(setPriorityFilterMock).toHaveBeenCalledWith(3);
    expect(setRatingFilterMock).toHaveBeenCalledWith(4);
  });
});
