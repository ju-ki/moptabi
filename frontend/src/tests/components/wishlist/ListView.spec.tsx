import React from 'react';
import { render, screen, fireEvent, within, waitFor, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

// prepare mocks for wishlistStore
const wishlistStoreMock = {
  getSortAndFilteredWishlist: vi.fn(),
  updateWishlist: vi.fn(),
  setWishlist: vi.fn(),
};

vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: () => wishlistStoreMock,
}));

// mock useFetchWishlist hook
const updateWishlistApi = vi.fn();
const deleteWishlistApi = vi.fn();
vi.mock('@/hooks/use-wishlist', () => ({
  useFetchWishlist: () => ({ updateWishlist: updateWishlistApi, deleteWishlist: deleteWishlistApi }),
}));

// Import component under test
import ListView from '@/components/wishlist/ListView';

describe('ListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wishlist の項目が一覧で表示されること', () => {
    const items = [
      {
        id: 1,
        spot: { meta: { name: '店A', image: '/a.jpg', rating: 4.5 } },
        memo: 'memo A',
        priority: 3,
        visited: 0,
      },
      {
        id: 2,
        spot: { meta: { name: '店B', image: '/b.jpg', rating: 3.2 } },
        memo: 'memo B',
        priority: 2,
        visited: 1,
      },
    ];

    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue(items);

    render(<ListView />);

    // two cards should be present with names
    expect(screen.getByText('店A')).toBeDefined();
    expect(screen.getByText('店B')).toBeDefined();
    // ratings displayed
    expect(screen.getByText('4.5')).toBeDefined();
    expect(screen.getByText('3.2')).toBeDefined();
  });

  it('メモを編集してフォーカスが外れたら store.update と api.update が呼ばれること', async () => {
    const items = [
      {
        id: 5,
        spot: { meta: { name: '店C', image: '/c.jpg', rating: 4.0 } },
        memo: 'old memo',
        priority: 1,
        visited: 0,
      },
    ];
    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue(items);

    render(<ListView />);

    // find the textarea for the item
    const card = screen.getByText('店C').closest('div');
    expect(card).toBeTruthy();
    const textarea = within(card as HTMLElement).getByRole('textbox') as HTMLTextAreaElement;

    // change value and blur
    fireEvent.change(textarea, { target: { value: 'new memo' } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(wishlistStoreMock.updateWishlist).toHaveBeenCalled();
      expect(updateWishlistApi).toHaveBeenCalled();
    });
  });

  it('訪問済みにするボタンを押すと update が呼ばれること', async () => {
    const items = [
      {
        id: 7,
        spot: { meta: { name: '店D', image: '/d.jpg', rating: 4.7 } },
        memo: '',
        priority: 4,
        visited: 0,
      },
    ];
    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue(items);

    render(<ListView />);

    // find the visit toggle button (first button in card)
    const card = screen.getByText('店D').closest('div');
    expect(card).toBeTruthy();
    const buttons = within(card as HTMLElement).getAllByRole('button');
    // first button is the visit toggle
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(wishlistStoreMock.updateWishlist).toHaveBeenCalled();
      expect(updateWishlistApi).toHaveBeenCalled();
    });
  });

  it('削除ボタンを押すと setWishlist と api.delete が呼ばれること', async () => {
    const items = [
      {
        id: 9,
        spot: { meta: { name: '店E', image: '/e.jpg', rating: 3.9 } },
        memo: '',
        priority: 2,
        visited: 0,
      },
    ];
    // getSortAndFilteredWishlist will be called multiple times; prepare it to return the array initially
    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue(items);

    render(<ListView />);

    // second button is delete (trash icon) - pick last button in card
    const card = screen.getByText('店E').closest('div');
    expect(card).toBeTruthy();
    const buttons = within(card as HTMLElement).getAllByRole('button');
    // ensure there are at least 2 buttons
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    const deleteBtn = buttons[buttons.length - 1];
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(wishlistStoreMock.setWishlist).toHaveBeenCalled();
      expect(deleteWishlistApi).toHaveBeenCalled();
    });
  });

  it('フィルタを適用したとき、フィルタ一致するスポットのみ表示されること', () => {
    const items = [
      {
        id: 1,
        spot: { meta: { name: '店A', image: '/a.jpg', rating: 4.5 } },
        memo: 'memo A',
        priority: 3,
        visited: 0,
      },
      {
        id: 2,
        spot: { meta: { name: '店B', image: '/b.jpg', rating: 3.2 } },
        memo: 'memo B',
        priority: 2,
        visited: 1,
      },
    ];

    // initial render shows both
    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue(items);
    const { rerender } = rtlRender(<ListView />);
    expect(screen.getByText('店A')).toBeDefined();
    expect(screen.getByText('店B')).toBeDefined();

    // simulate applying a filter that only returns visited items (店B)
    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue([items[1]]);
    rerender(<ListView />);

    expect(screen.queryByText('店A')).toBeNull();
    expect(screen.getByText('店B')).toBeDefined();
  });
});
