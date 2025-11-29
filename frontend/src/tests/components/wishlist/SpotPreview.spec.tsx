import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

// prepare spies and mocks for wishlistStore
const addWishlist = vi.fn();
const setSelectedSpot = vi.fn();
const getSelectedSpot = vi.fn();
const isAlreadyAddedWishlist = vi.fn();

// mock useWishlistStore to return an object with methods used in SpotPreview
vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: () => ({
    getSelectedSpot,
    isAlreadyAddedWishlist,
    addWishlist,
    setSelectedSpot,
  }),
}));

// mock use-toast so we can assert toasts
const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

// mock use-wishlist hook (postWishlist)
const postWishlist = vi.fn();
vi.mock('@/hooks/use-wishlist', () => ({
  useFetchWishlist: () => ({ postWishlist }),
}));

import SpotPreview from '@/components/wishlist/SpotPreview';

describe('SpotPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('スポットが未選択のときはプレースホルダが表示されること', () => {
    getSelectedSpot.mockReturnValue(undefined);

    render(<SpotPreview onBack={() => {}} />);

    expect(screen.getByText('スポットを選択してください')).toBeDefined();
    expect(screen.getByText('詳細情報が表示されます')).toBeDefined();
  });

  it('選択されたスポットの情報が表示されること', () => {
    const spot = {
      id: 's1',
      location: { name: 'テストスポット' },
      image: '/img.jpg',
      rating: 4.2,
      ratingCount: 12,
      category: ['restaurant'],
      address: '東京都千代田区',
      url: 'https://example.com',
    };

    getSelectedSpot.mockReturnValue(spot);
    isAlreadyAddedWishlist.mockReturnValue(false);

    render(<SpotPreview onBack={() => {}} />);

    expect(screen.getByText('テストスポット')).toBeDefined();
    expect(screen.getByText('4.2')).toBeDefined();
    expect(screen.getByText('(12件のレビュー)')).toBeDefined();
    expect(screen.getByText('東京都千代田区')).toBeDefined();
    // button for adding should be present
    expect(screen.getByText('行きたいリストに追加')).toBeDefined();
  });

  it('行きたいリストに追加が成功すると store と toast が呼ばれること', async () => {
    const spot = {
      id: 's2',
      location: { name: '追加スポット', lat: 1, lng: 2 },
      image: '/img2.jpg',
      rating: 3.8,
      ratingCount: 3,
      category: ['cafe'],
      address: '住所サンプル',
      url: '',
    } as any;

    getSelectedSpot.mockReturnValue(spot);
    isAlreadyAddedWishlist.mockReturnValue(false);

    // make postWishlist resolve to ok: true
    postWishlist.mockResolvedValue({ ok: true });

    render(<SpotPreview onBack={() => {}} />);

    const btn = screen.getByText('行きたいリストに追加');
    fireEvent.click(btn);

    // wait for the postWishlist .then handler to complete
    await waitFor(() => {
      expect(postWishlist).toHaveBeenCalled();
    });

    // after success, addWishlist and setSelectedSpot(null) should have been called
    expect(addWishlist).toHaveBeenCalled();
    expect(setSelectedSpot).toHaveBeenCalledWith(null);

    // toast called with success variant
    expect(toast).toHaveBeenCalled();
    const toastArg = toast.mock.calls[0][0];
    expect(toastArg.variant).toBe('success');
  });

  it('行きたいリスト追加が失敗した場合はエラートーストが呼ばれること', async () => {
    const spot = {
      id: 's3',
      location: { name: '失敗スポット', lat: 9, lng: 9 },
      image: '/img3.jpg',
      rating: 2.5,
      ratingCount: 1,
      category: [],
      address: 'どこか',
      url: '',
    } as any;

    getSelectedSpot.mockReturnValue(spot);
    isAlreadyAddedWishlist.mockReturnValue(false);

    // simulate failure by throwing synchronously so the component's try/catch handles it
    postWishlist.mockImplementation(() => {
      throw new Error('スポットの追加に失敗しました');
    });

    render(<SpotPreview onBack={() => {}} />);

    const btn = screen.getByText('行きたいリストに追加');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(postWishlist).toHaveBeenCalled();
    });

    expect(addWishlist).not.toHaveBeenCalled();
    // toast should be called with destructive variant for error
    expect(toast).toHaveBeenCalled();
    const toastArg = toast.mock.calls[0][0];
    expect(toastArg.variant).toBe('destructive');
  });
});
