import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SWRConfig } from 'swr';

import SpotSelection from '@/components/spot-selection/SpotSelectionDialog';

/**
 * WishlistSpotSearch テスト
 *
 * SpotSelectionDialog の行きたいリストタブ機能を検証する。
 * - 行きたいリストタブの表示・操作
 * - スポットの表示（通常・空・ローディング・エラー）
 * - 行きたいリストからのスポット選択
 */

// Mock store functions
const mockSetSpots = vi.fn();
const mockSearchSpots = vi.fn();

// 動的モックデータ（参照を保持するため）
const mockData = {
  wishlist: { spots: [] as any[], isLoading: false, error: null as Error | null },
  visited: { spots: [] as any[], isLoading: false, error: null as Error | null },
  searchResults: [] as any[],
  searchKeyword: '',
  highRating: false,
};

// Mock Google Maps
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children, onLoad }: any) => {
    React.useEffect(() => {
      if (onLoad) onLoad({} as google.maps.Map);
    }, [onLoad]);
    return <div data-testid="google-map">{children}</div>;
  },
  Marker: ({ onClick, position, onMouseOver }: any) => (
    <div
      data-testid={`marker-${position.lat}-${position.lng}`}
      onClick={onClick}
      onMouseOver={onMouseOver}
      role="button"
      aria-label="map-marker"
      data-highlighted="false"
    />
  ),
  InfoWindow: ({ children }: any) => <div data-testid="info-window">{children}</div>,
  Circle: ({ center, radius }: any) => (
    <div data-testid="google-circle" data-center={JSON.stringify(center)} data-radius={radius} />
  ),
}));

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    userId: 'test-user-id',
    isLoaded: true,
    isSignedIn: true,
  }),
}));

// Mock searchSpots function
vi.mock('@/lib/plan', () => ({
  searchSpots: (...args: any[]) => mockSearchSpots(...args),
  useStoreForPlanning: () => ({
    setSpots: mockSetSpots,
    planErrors: {},
    plans: [{ date: '2025-12-15', spots: [] }],
  }),
}));

// Mock spot search store
vi.mock('@/store/planning/spotSearchStore', () => ({
  useSpotSearchStore: () => ({
    searchCenter: { id: 'tokyo', lat: 35.6812, lng: 139.7671, name: '東京駅' },
    setSearchCenter: vi.fn(),
    searchRadius: [5],
    setSearchRadius: vi.fn(),
    searchCategories: [],
    setSearchCategories: vi.fn(),
    searchKeyword: mockData.searchKeyword,
    setSearchKeyword: (keyword: string) => {
      mockData.searchKeyword = keyword;
    },
    searchResults: mockData.searchResults,
    setSearchResults: (results: any[]) => {
      mockData.searchResults = results;
    },
    mapCenter: { lat: 35.6812, lng: 139.7671 },
    setMapCenter: vi.fn(),
    highRating: mockData.highRating,
    setHighRating: (value: boolean) => {
      mockData.highRating = value;
    },
    wishlistPrefectureFilter: 'all',
    setWishlistPrefectureFilter: vi.fn(),
    wishlistPriorityFilter: 99,
    setWishlistPriorityFilter: vi.fn(),
    wishlistSortBy: 'priority',
    setWishlistSortBy: vi.fn(),
    wishlistSortOrder: 'desc',
    setWishlistSortOrder: vi.fn(),
    visitedPrefectureFilter: 'all',
    setVisitedPrefectureFilter: vi.fn(),
    visitedDateFrom: '',
    setVisitedDateFrom: vi.fn(),
    visitedDateTo: '',
    setVisitedDateTo: vi.fn(),
    visitedMinVisitCount: 0,
    setVisitedMinVisitCount: vi.fn(),
    visitedSortBy: 'visitedAt',
    setVisitedSortBy: vi.fn(),
    visitedSortOrder: 'desc',
    setVisitedSortOrder: vi.fn(),
  }),
}));

// Mock wishlist spots hook
vi.mock('@/hooks/spot-search/use-wishlist-spots', () => ({
  useWishlistSpots: () => mockData.wishlist,
}));

// Mock visited spots hook
vi.mock('@/hooks/spot-search/use-visited-spots', () => ({
  useVisitedSpots: () => mockData.visited,
}));

// Mock algorithm
vi.mock('@/lib/algorithm', () => ({
  setStartTimeAutomatically: (spot: any) => ({
    ...spot,
    stayStart: '10:00',
    stayEnd: '12:00',
  }),
}));

// Helper: SWRConfigでラップしたレンダー関数
const renderWithSWR = (ui: React.ReactElement) => {
  return render(<SWRConfig value={{ provider: () => new Map() }}>{ui}</SWRConfig>);
};

// Helper: Radix UIのタブをクリックするためのヘルパー関数
const clickRadixTab = async (tab: HTMLElement) => {
  await act(async () => {
    fireEvent.mouseDown(tab);
    fireEvent.focus(tab);
    fireEvent.click(tab);
  });
};

describe('WishlistSpotSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchSpots.mockReset();
    mockSetSpots.mockReset();
    mockData.wishlist = { spots: [], isLoading: false, error: null };
    mockData.visited = { spots: [], isLoading: false, error: null };
    mockData.searchResults = [];
    mockData.searchKeyword = '';
    mockData.highRating = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('行きたいリストタブの表示', () => {
    it('行きたいリストタブに切り替えるとスポットが表示されること', async () => {
      // Given: 行きたいリストにスポットが存在する
      mockData.wishlist = {
        spots: [
          {
            id: 'wishlist-1',
            location: { name: '東京スカイツリー', lat: 35.7101, lng: 139.8107 },
            priority: 3,
          },
        ],
        isLoading: false,
        error: null,
      };

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      await waitFor(() => {
        expect(wishlistTab).toHaveAttribute('data-state', 'active');
      });

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-spot-card-wishlist-1')).toBeInTheDocument();
      });
    });

    it('行きたいリストが空の場合、適切なメッセージが表示されること', async () => {
      // Given: 行きたいリストが空
      mockData.wishlist = {
        spots: [],
        isLoading: false,
        error: null,
      };

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      await waitFor(() => {
        expect(screen.getByText(/行きたいリストにスポットが登録されていません/i)).toBeInTheDocument();
      });
    });

    it('ローディング中はスピナーが表示されること', async () => {
      // Given: ローディング中
      mockData.wishlist = {
        spots: [],
        isLoading: true,
        error: null,
      };

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });
    });

    it('APIエラー時はエラーメッセージが表示されること', async () => {
      // Given: APIエラー発生
      mockData.wishlist = {
        spots: [],
        isLoading: false,
        error: new Error('API Error'),
      };

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      await waitFor(() => {
        expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('スポット選択', () => {
    it('行きたいリストのスポットをクリックするとsetSpotsが呼ばれること', async () => {
      // Given: 行きたいリストにスポットが存在する
      mockData.wishlist = {
        spots: [
          {
            id: 'wishlist-spot',
            location: { name: '行きたいスポット', lat: 35.6762, lng: 139.6503 },
          },
        ],
        isLoading: false,
        error: null,
      };

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-spot-card-wishlist-spot')).toBeInTheDocument();
      });

      const spotCard = screen.getByTestId('wishlist-spot-card-wishlist-spot');
      fireEvent.click(spotCard);

      await waitFor(() => {
        expect(mockSetSpots).toHaveBeenCalled();
      });
    });
  });

  describe('E2Eシナリオ', () => {
    it('行きたいリストからスポットを選択するシナリオが正常に動作すること', async () => {
      // Given: 行きたいリストにスポットが登録済み
      mockData.wishlist = {
        spots: [
          {
            id: 'spot-a',
            location: { name: 'スポットA', lat: 35.6762, lng: 139.6503 },
            priority: 3,
          },
        ],
        isLoading: false,
        error: null,
      };

      renderWithSWR(<SpotSelection date="2025-12-15" />);

      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-spot-card-spot-a')).toBeInTheDocument();
      });

      const spotCardA = screen.getByTestId('wishlist-spot-card-spot-a');
      fireEvent.click(spotCardA);

      await waitFor(() => {
        expect(mockSetSpots).toHaveBeenCalled();
      });
    });
  });
});
