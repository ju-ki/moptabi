import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

import { Coordination, Spot } from '@/types/plan';

interface SpotSearchState {
  // 検索条件
  searchCenter: Coordination | undefined;
  searchRadius: number[];
  searchCategories: string[];
  searchKeyword: string;
  highRating: boolean;

  // スポット検索条件(行きたいリスト)
  wishlistPrefectureFilter: string;
  wishlistPriorityFilter: number;
  wishlistSortBy: 'priority' | 'createdAt';
  wishlistSortOrder: 'asc' | 'desc';

  // スポット検索条件(訪問済みリスト)
  visitedPrefectureFilter: string;
  visitedDateFrom: string;
  visitedDateTo: string;
  visitedMinVisitCount: number;
  visitedSortBy: 'visitedAt' | 'createdAt' | 'planDate' | 'visitCount';
  visitedSortOrder: 'asc' | 'desc';

  // 検索結果
  searchResults: Spot[];
  mapCenter: Coordination;
  filteredWishlistSpot: Spot[]; // ウィッシュリストからのフィルタ済みスポット
  filteredVisitedSpot: Spot[]; // 訪問済みリストからのフィルタ済みスポット

  // UI状態
  mapSelectOpen: boolean;
  selectedSpot: Spot | null;

  // スポットの検索条件のアクション(行きたいリスト)
  setWishlistPrefectureFilter: (prefecture: string) => void;
  setWishlistPriorityFilter: (priority: number) => void;
  setWishlistSortBy: (sortBy: 'priority' | 'createdAt') => void;
  setWishlistSortOrder: (order: 'asc' | 'desc') => void;

  // スポットの検索条件のアクション(訪問済みリスト)
  setVisitedPrefectureFilter: (prefecture: string) => void;
  setVisitedDateFrom: (date: string) => void;
  setVisitedDateTo: (date: string) => void;
  setVisitedMinVisitCount: (count: number) => void;
  setVisitedSortBy: (sortBy: 'visitedAt' | 'createdAt' | 'planDate' | 'visitCount') => void;
  setVisitedSortOrder: (order: 'asc' | 'desc') => void;

  // アクション
  setSearchCenter: (center: Coordination | undefined) => void;
  setSearchRadius: (radius: number[]) => void;
  setSearchCategories: (categoryId: string) => void; // トグル動作
  setSearchKeyword: (keyword: string) => void;
  setHighRating: (value: boolean) => void;
  setSearchResults: (results: Spot[]) => void;
  setFilteredWishlistSpot: (spots: Spot[]) => void;
  setFilteredVisitedSpot: (spots: Spot[]) => void;
  setMapCenter: (center: Coordination) => void;
  setMapSelectOpen: (open: boolean) => void;
  setSelectedSpot: (spot: Spot | null) => void;
  resetFilters: () => void;
}

const defaultCenter: Coordination = {
  id: 'tokyo-station',
  lat: 35.6812,
  lng: 139.7671,
  name: '東京駅',
};

export const useSpotSearchStore = create<SpotSearchState>()(
  immer(
    devtools((set, get) => ({
      // 初期値（wishlistStore と同様のパターン）
      searchCenter: defaultCenter,
      searchRadius: [5],
      searchCategories: [],
      searchKeyword: '',
      highRating: false,
      searchResults: [],
      filteredWishlistSpot: [],
      filteredVisitedSpot: [],
      mapCenter: defaultCenter,
      mapSelectOpen: false,
      selectedSpot: null,

      // 初期値（スポットの検索条件）
      wishlistPrefectureFilter: 'all',
      wishlistPriorityFilter: 99,
      wishlistSortBy: 'priority',
      wishlistSortOrder: 'desc',
      visitedPrefectureFilter: 'all',
      visitedDateFrom: '',
      visitedDateTo: '',
      visitedMinVisitCount: 0,
      visitedSortBy: 'visitedAt',
      visitedSortOrder: 'desc',

      getFilteredVisitedSpot() {
        return get().filteredVisitedSpot;
      },
      getFilteredWishlistSpot() {
        return get().filteredWishlistSpot;
      },

      // アクション
      setSearchCenter: (center) => {
        set((state) => {
          state.searchCenter = center;
        });
      },

      setSearchRadius: (radius) => {
        set((state) => {
          state.searchRadius = radius;
        });
      },

      setSearchCategories: (categoryId) => {
        set((state) => {
          const index = state.searchCategories.indexOf(categoryId);
          if (index >= 0) {
            state.searchCategories.splice(index, 1);
          } else {
            state.searchCategories.push(categoryId);
          }
        });
      },

      setSearchKeyword: (keyword) => {
        set((state) => {
          state.searchKeyword = keyword;
        });
      },

      setHighRating: (value) => {
        set((state) => {
          state.highRating = value;
        });
      },

      setSearchResults: (results) => {
        set((state) => {
          state.searchResults = results;
        });
      },

      setMapCenter: (center) => {
        set((state) => {
          state.mapCenter = center;
        });
      },

      setFilteredWishlistSpot: (spots) => {
        set((state) => {
          state.filteredWishlistSpot = spots;
        });
      },

      setFilteredVisitedSpot: (spots) => {
        set((state) => {
          state.filteredVisitedSpot = spots;
        });
      },

      setMapSelectOpen: (open) => {
        set((state) => {
          state.mapSelectOpen = open;
        });
      },

      setSelectedSpot: (spot) => {
        set((state) => {
          state.selectedSpot = spot;
        });
      },

      // スポットの検索条件のアクション(行きたいリスト)
      setWishlistPrefectureFilter: (prefecture) => {
        set((state) => {
          state.wishlistPrefectureFilter = prefecture;
        });
      },
      setWishlistPriorityFilter: (priority) => {
        set((state) => {
          state.wishlistPriorityFilter = priority;
        });
      },
      setWishlistSortBy: (sortBy) => {
        set((state) => {
          state.wishlistSortBy = sortBy;
        });
      },
      setWishlistSortOrder: (order) => {
        set((state) => {
          state.wishlistSortOrder = order;
        });
      },

      // スポットの検索条件のアクション(訪問済みリスト)
      setVisitedPrefectureFilter: (prefecture) => {
        set((state) => {
          state.visitedPrefectureFilter = prefecture;
        });
      },
      setVisitedDateFrom: (date) => {
        set((state) => {
          state.visitedDateFrom = date;
        });
      },
      setVisitedDateTo: (date) => {
        set((state) => {
          state.visitedDateTo = date;
        });
      },
      setVisitedMinVisitCount: (count) => {
        set((state) => {
          state.visitedMinVisitCount = count;
        });
      },
      setVisitedSortBy: (sortBy) => {
        set((state) => {
          state.visitedSortBy = sortBy;
        });
      },
      setVisitedSortOrder: (order) => {
        set((state) => {
          state.visitedSortOrder = order;
        });
      },
      resetFilters: () => {
        set((state) => {
          state.searchCenter = defaultCenter;
          state.searchRadius = [5];
          state.searchCategories = [];
          state.searchKeyword = '';
          state.highRating = false;
        });
      },
    })),
  ),
);
