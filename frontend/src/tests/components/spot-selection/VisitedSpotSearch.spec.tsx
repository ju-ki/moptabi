import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SWRConfig } from 'swr';

import SpotSelection from '@/components/spot-selection/SpotSelectionDialog';

/**
 * VisitedSpotSearch テスト
 *
 * SpotSelectionDialog の過去のスポットタブ機能を検証する。
 * - 過去のスポットタブの表示・操作
 * - スポットの表示（通常・空・ローディング・エラー）
 * - 過去スポットからのスポット選択
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

describe('VisitedSpotSearch', () => {
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

  describe('過去のスポットタブの表示', () => {
    it('過去のスポットタブに切り替えると訪問履歴が表示されること', async () => {
      // Given: 過去のスポットが存在する
      mockData.visited = {
        spots: [
          {
            id: 'visited-1',
            location: { name: '浅草寺', lat: 35.7148, lng: 139.7967 },
            visitedAt: '2025-11-15',
            prefecture: '東京都',
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

      const visitedTab = screen.getByRole('tab', { name: /過去のスポット/i });
      await clickRadixTab(visitedTab);

      await waitFor(() => {
        expect(visitedTab).toHaveAttribute('data-state', 'active');
      });

      await waitFor(() => {
        expect(screen.getByTestId('visited-spot-card-visited-1')).toBeInTheDocument();
      });
    });

    it('過去のスポットが空の場合、適切なメッセージが表示されること', async () => {
      // Given: 過去のスポットが空
      mockData.visited = {
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

      const visitedTab = screen.getByRole('tab', { name: /過去のスポット/i });
      await clickRadixTab(visitedTab);

      await waitFor(() => {
        expect(screen.getByText(/過去に訪問・計画したスポットがありません/i)).toBeInTheDocument();
      });
    });

    it('ローディング中はスピナーが表示されること', async () => {
      // Given: ローディング中
      mockData.visited = {
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

      const visitedTab = screen.getByRole('tab', { name: /過去のスポット/i });
      await clickRadixTab(visitedTab);

      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });
    });

    it('APIエラー時はエラーメッセージが表示されること', async () => {
      // Given: APIエラー発生
      mockData.visited = {
        spots: [],
        isLoading: false,
        error: new Error('Network Error'),
      };

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const visitedTab = screen.getByRole('tab', { name: /過去のスポット/i });
      await clickRadixTab(visitedTab);

      await waitFor(() => {
        expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('スポット選択', () => {
    it('過去のスポットをクリックするとsetSpotsが呼ばれること', async () => {
      // Given: 過去のスポットが存在する
      mockData.visited = {
        spots: [
          {
            id: 'visited-spot',
            location: { name: '過去に訪れたスポット', lat: 35.6762, lng: 139.6503 },
            visitedAt: '2025-01-15',
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

      const visitedTab = screen.getByRole('tab', { name: /過去のスポット/i });
      await clickRadixTab(visitedTab);

      await waitFor(() => {
        expect(screen.getByTestId('visited-spot-card-visited-spot')).toBeInTheDocument();
      });

      const spotCard = screen.getByTestId('visited-spot-card-visited-spot');
      fireEvent.click(spotCard);

      await waitFor(() => {
        expect(mockSetSpots).toHaveBeenCalled();
      });
    });
  });

  describe('E2Eシナリオ', () => {
    it('過去のスポットから再度計画に追加するシナリオが正常に動作すること', async () => {
      // Given: 過去に訪問したスポットが存在する
      mockData.visited = {
        spots: [
          {
            id: 'kiyomizu-dera',
            location: { name: '清水寺', lat: 34.9949, lng: 135.785 },
            visitedAt: '2025-01-10',
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

      const visitedTab = screen.getByRole('tab', { name: /過去のスポット/i });
      await clickRadixTab(visitedTab);

      await waitFor(() => {
        expect(screen.getByTestId('visited-spot-card-kiyomizu-dera')).toBeInTheDocument();
      });

      const spotCard = screen.getByTestId('visited-spot-card-kiyomizu-dera');
      fireEvent.click(spotCard);

      await waitFor(() => {
        expect(mockSetSpots).toHaveBeenCalled();
      });
    });
  });
});
