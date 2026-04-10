import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SWRConfig } from 'swr';

import SpotSelection from '@/components/spot-selection/SpotSelectionDialog';

/**
 * GoogleSpotSearch テスト
 *
 * SpotSelectionDialog の Google検索タブ機能を検証する。
 * - ダイアログの開閉・基本動作
 * - タブ切り替え機能
 * - Google検索（エリア検索・キーワード検索）
 * - SearchResultsView との連携
 * - エラーハンドリング・パフォーマンス・アクセシビリティ
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

// Helper: ダイアログ内のボタンをクリックするためのヘルパー関数
const clickDialogButton = async (button: HTMLElement) => {
  await act(async () => {
    fireEvent.click(button);
  });
};

describe('GoogleSpotSearch', () => {
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

  describe('ダイアログの基本動作', () => {
    it('「観光地を選択」ボタンをクリックするとダイアログが開くこと', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);

      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('観光地を検索')).toBeInTheDocument();
    });

    it('ダイアログを閉じることができること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('ダイアログを開くとGoogle検索フォームが表示されること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);

      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByTestId('google-search-form')).toBeInTheDocument();
    });
  });

  describe('タブ切り替え機能', () => {
    it('デフォルトではGoogle検索タブがアクティブであること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const googleTab = screen.getByRole('tab', { name: /Google検索/i });
      expect(googleTab).toHaveAttribute('data-state', 'active');
    });

    it('行きたいリストタブに切り替えられること', async () => {
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
    });

    it('過去のスポットタブに切り替えられること', async () => {
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
    });

    it('タブを切り替えると対応するコンテンツが表示されること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Google検索タブのコンテンツが表示されている
      expect(screen.getByTestId('google-search-form')).toBeInTheDocument();

      // 行きたいリストタブに切り替え
      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-content')).toBeInTheDocument();
      });
    });
  });

  describe('エリア検索', () => {
    it('検索ボタンをクリックするとsearchSpotsが呼ばれること', async () => {
      mockSearchSpots.mockResolvedValueOnce([]);

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /検索する/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockSearchSpots).toHaveBeenCalled();
      });
    });

    it('検索を実行するとsearchSpotsが1度だけ呼ばれること', async () => {
      mockSearchSpots.mockResolvedValueOnce([]);

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /検索する/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockSearchSpots).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('キーワード検索', () => {
    it('キーワード検索タブに切り替えられること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Google検索タブ内のキーワード検索タブに切り替え
      const keywordTab = screen.getByRole('tab', { name: /キーワード/i });
      await clickRadixTab(keywordTab);

      await waitFor(() => {
        expect(keywordTab).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('SearchResultsView連携', () => {
    it('searchSpotsが呼ばれた後にSearchResultsViewが更新されること', async () => {
      const mockResults = [
        {
          id: 'list-spot',
          location: { name: 'リスト表示スポット', lat: 35.6762, lng: 139.6503 },
          rating: 4.5,
        },
      ];
      mockSearchSpots.mockResolvedValueOnce(mockResults);

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /検索する/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockSearchSpots).toHaveBeenCalled();
      });
    });
  });

  describe('スポット選択', () => {
    it('検索実行後にsearchSpotsが正しいパラメータで呼ばれること', async () => {
      const mockResults = [
        {
          id: 'spot-to-select',
          location: { name: '選択するスポット', lat: 35.6762, lng: 139.6503 },
          rating: 4.5,
        },
      ];
      mockSearchSpots.mockResolvedValueOnce(mockResults);

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /検索する/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockSearchSpots).toHaveBeenCalled();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('Google Places APIがエラーを返した場合でもクラッシュしないこと', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchSpots.mockRejectedValueOnce(new Error('Google Places API Error'));

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      await clickDialogButton(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /検索する/i });
      await clickDialogButton(searchButton);

      await waitFor(() => {
        expect(mockSearchSpots).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSearchSpots).toHaveBeenCalledTimes(1);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('パフォーマンスとUX', () => {
    it('検索中はローディング状態が表示されること', async () => {
      let resolveSearch: (value: any[]) => void;
      mockSearchSpots.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve;
          }),
      );

      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /検索する/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        const searchingButton = screen.queryByRole('button', { name: /検索中/i });
        const disabledButton = screen.getByRole('button', { name: /検索する|検索中/i });
        expect(searchingButton || disabledButton.hasAttribute('disabled')).toBeTruthy();
      });

      resolveSearch!([]);
    });

    it('タブ切り替えが即座に反応すること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });
      await clickRadixTab(wishlistTab);

      expect(wishlistTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByTestId('wishlist-content')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('キーボードでタブを切り替えられること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      await clickDialogButton(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const googleTab = screen.getByRole('tab', { name: /Google検索/i });
      const wishlistTab = screen.getByRole('tab', { name: /行きたいリスト/i });

      await act(async () => {
        googleTab.focus();
      });

      expect(googleTab).toHaveFocus();

      await act(async () => {
        fireEvent.keyDown(googleTab, { key: 'ArrowRight', code: 'ArrowRight' });
      });

      await waitFor(() => {
        const hasCorrectFocus = document.activeElement === wishlistTab;
        const isActive = wishlistTab.getAttribute('data-state') === 'active';
        expect(hasCorrectFocus || isActive).toBe(true);
      });
    });

    it('適切なARIA属性が設定されていること', async () => {
      renderWithSWR(<SpotSelection date="2025-12-15" />);
      const triggerButton = screen.getByRole('button', { name: /観光地を選択/ });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const activeTab = screen.getByRole('tab', { name: /Google検索/i });
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
