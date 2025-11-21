import React from 'react';
import { render, screen, fireEvent, within, waitFor, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

// Mock @react-google-maps/api components to render DOM elements for Marker and InfoWindow
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children, onLoad }: any) => {
    if (typeof onLoad === 'function') onLoad({});
    return <div data-testid="google-map">{children}</div>;
  },
  Marker: ({ onClick, position, key }: any) => (
    <div data-testid={`marker-${position?.lat}`} onClick={() => typeof onClick === 'function' && onClick()} />
  ),
  InfoWindow: ({ children, onCloseClick }: any) => (
    <div data-testid="info-window">
      <button data-testid="info-close" onClick={() => typeof onCloseClick === 'function' && onCloseClick()}>
        close
      </button>
      {children}
    </div>
  ),
  useJsApiLoader: () => ({ isLoaded: true }),
}));

// Provide minimal global google mock used for Marker icon
(global as any).google = {
  maps: {
    SymbolPath: { CIRCLE: {} },
  },
};

// wishlist store mock
const wishlistStoreMock: any = {
  getSortAndFilteredWishlist: vi.fn(),
  getSelectedWishlist: vi.fn(),
  setSelectedWishlist: vi.fn(),
  updateWishlist: vi.fn(),
  setWishlist: vi.fn(),
};
vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: () => wishlistStoreMock,
}));

// hooks
const updateWishlistApi = vi.fn();
const deleteWishlistApi = vi.fn();
vi.mock('@/hooks/use-wishlist', () => ({
  useFetchWishlist: () => ({ updateWishlist: updateWishlistApi, deleteWishlist: deleteWishlistApi }),
}));

import MapView from '@/components/wishlist/MapView';

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wishlist の数だけ Marker が描画されること、クリックで setSelectedWishlist が呼ばれること', () => {
    const items = [
      { spotId: 1, spot: { meta: { latitude: 10, longitude: 11, name: 'A' } }, priority: 1, visited: 0 },
      { spotId: 2, spot: { meta: { latitude: 20, longitude: 21, name: 'B' } }, priority: 2, visited: 1 },
    ];
    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue(items);
    wishlistStoreMock.getSelectedWishlist.mockReturnValue(undefined);

    render(<MapView />);

    // two markers
    expect(screen.getByTestId('marker-10')).toBeDefined();
    expect(screen.getByTestId('marker-20')).toBeDefined();

    // click first marker
    fireEvent.click(screen.getByTestId('marker-10'));
    expect(wishlistStoreMock.setSelectedWishlist).toHaveBeenCalledWith(items[0]);
  });

  it('selectedWishlist があると InfoWindow が表示され、ボタン操作で update/delete が呼ばれること', async () => {
    const selected = {
      id: 3,
      spotId: 3,
      spot: { meta: { latitude: 30, longitude: 31, name: 'C', description: 'desc', rating: 4.4 } },
      memo: 'memoC',
      priority: 5,
      visited: 0,
    } as any;

    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue([selected]);
    wishlistStoreMock.getSelectedWishlist.mockReturnValue(selected);

    render(<MapView />);

    // InfoWindow should show
    expect(screen.getByTestId('info-window')).toBeDefined();
    expect(screen.getByText('C')).toBeDefined();
    expect(screen.getByText('desc')).toBeDefined();
    expect(screen.getByText('優先度:')).toBeDefined();

    // click visit toggle (first button in InfoWindow)
    const info = screen.getByTestId('info-window');
    const buttons = within(info).getAllByRole('button');
    // first button toggles visited
    fireEvent.click(buttons[1]); // buttons[0] is close button we added in mock

    await waitFor(() => {
      expect(wishlistStoreMock.updateWishlist).toHaveBeenCalled();
      expect(updateWishlistApi).toHaveBeenCalled();
    });

    // click delete (destructive) - last button
    fireEvent.click(buttons[2]);
    await waitFor(() => {
      expect(wishlistStoreMock.setWishlist).toHaveBeenCalled();
      expect(deleteWishlistApi).toHaveBeenCalled();
    });
  });

  it('フィルタを適用したとき、フィルタ一致するスポットのみマーカーが表示されること', () => {
    const items = [
      { spotId: 1, spot: { meta: { latitude: 10, longitude: 11, name: 'A' } }, priority: 1, visited: 0 },
      { spotId: 2, spot: { meta: { latitude: 20, longitude: 21, name: 'B' } }, priority: 2, visited: 1 },
    ];

    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue(items);
    const { rerender } = rtlRender(<MapView />);

    // both markers present
    expect(screen.getByTestId('marker-10')).toBeDefined();
    expect(screen.getByTestId('marker-20')).toBeDefined();

    // now simulate filter that returns only the second item
    wishlistStoreMock.getSortAndFilteredWishlist.mockReturnValue([items[1]]);
    rerender(<MapView />);

    expect(screen.queryByTestId('marker-10')).toBeNull();
    expect(screen.getByTestId('marker-20')).toBeDefined();
  });
});
