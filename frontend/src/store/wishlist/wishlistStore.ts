import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

import { FilteredWishlistType, SortWishlistType, ViewModeType, WishlistType } from '@/types/wishlist';
import { Coordination, Spot } from '@/types/plan';

interface WishlistState {
  viewMode: ViewModeType;
  wishlist: WishlistType[];
  filteredType: FilteredWishlistType;
  sortByType: SortWishlistType;
  mapSelectOpen: boolean;
  searchCenter: Coordination | undefined;
  searchRadius: number[];
  selectedSpot: Spot | null;
  selectedWishlist: WishlistType | null;
  areaSearchResults: Spot[];
  keywordSearchResults: Spot[];
  areaMapCenter: Coordination;
  keywordMapCenter: Coordination;
  searchKeyword: string;
  searchCategories: string[];
  showAdvanced: boolean;
  highRating: boolean;
  prefectureFilter: string | null;
  priorityFilter: number | null;
  ratingFilter: number | null;
  getWishlist: () => WishlistType[];
  setWishlist: (wishList: WishlistType[]) => void;
  getViewMode: () => ViewModeType;
  setViewMode: (mode: ViewModeType) => void;
  getFilteredType: () => FilteredWishlistType;
  setFilteredType: (mode: FilteredWishlistType) => void;
  getSortByType: () => SortWishlistType;
  setSortByType: (mode: SortWishlistType) => void;
  getSortAndFilteredWishlist: () => WishlistType[];
  isAlreadyAddedWishlist: (id: string) => boolean;
  addWishlist: (wishlist: WishlistType) => void;
  updateWishlist: (wishlist: WishlistType) => void;
  getSearchCenter: () => Coordination | undefined;
  setSearchCenter: (center: Coordination | undefined) => void;
  getSelectMapOpen: () => boolean;
  setSelectMapOpen: (check: boolean) => void;
  getSearchRadius: () => number[];
  setSearchRadius: (radius: number[]) => void;
  getSelectedSpot: () => Spot | null;
  setSelectedSpot: (spot: Spot | null) => void;
  getSelectedWishlist: () => WishlistType | null;
  setSelectedWishlist: (wishlist: WishlistType | null) => void;
  getAreaSearchResults: () => Spot[];
  setAreaSearchResults: (results: Spot[]) => void;
  getKeywordSearchResults: () => Spot[];
  setKeywordSearchResults: (results: Spot[]) => void;
  getAreaMapCenter: () => Coordination;
  setAreaMapCenter: (center: Coordination) => void;
  getKeywordMapCenter: () => Coordination;
  setKeywordMapCenter: (center: Coordination) => void;
  getSearchKeyword: () => string;
  setSearchKeyword: (keyword: string) => void;
  getSearchCategories: () => string[];
  setSearchCategories: (keyword: string) => void;
  getShowAdvanced: () => boolean;
  setShowAdvanced: (check: boolean) => void;
  getHighRating: () => boolean;
  setHighRating: (check: boolean) => void;
  setPrefectureFilter: (pref: string | null) => void;
  setPriorityFilter: (val: number | null) => void;
  setRatingFilter: (val: number | null) => void;
}

export const useWishlistStore = create<WishlistState>()(
  immer(
    devtools((set, get) => ({
      wishlist: [],
      prefectureFilter: null,
      priorityFilter: null,
      ratingFilter: null,
      viewMode: 'list',
      filteredType: 'all',
      sortByType: 'priority',
      mapSelectOpen: false,
      searchRadius: [5],
      selectedSpot: null,
      selectedWishlist: null,
      areaSearchResults: [],
      keywordSearchResults: [],
      areaMapCenter: { lat: 35.6762, lng: 139.6503 },
      keywordMapCenter: { lat: 35.6762, lng: 139.6503 },
      searchKeyword: '',
      searchCategories: [],
      showAdvanced: false,
      highRating: false,
      getWishList: () => {
        return [];
      },
      setWishlist: (wishlist) => {
        set((state) => {
          state.wishlist = wishlist;
        });
      },
      getViewMode() {
        return get().viewMode;
      },
      setViewMode(mode) {
        set((state) => {
          state.viewMode = mode;
        });
      },
      getFilteredType() {
        return get().filteredType;
      },
      setFilteredType(mode) {
        set((state) => {
          state.filteredType = mode;
        });
      },
      getSortByType() {
        return get().sortByType;
      },
      setSortByType(mode) {
        set((state) => {
          state.sortByType = mode;
        });
      },
      getSortAndFilteredWishlist() {
        let list = get().wishlist;
        // 都道府県フィルター
        if (get().prefectureFilter) {
          list = list.filter((item) => {
            const prefecture = (item.spot.meta as { prefecture?: string }).prefecture;
            return prefecture === undefined || prefecture === get().prefectureFilter;
          });
        }
        // 訪問未訪問フィルター
        if (get().filteredType === 'visited') {
          list = list.filter((item) => item.visited);
        } else if (get().filteredType === 'unvisited') {
          list = list.filter((item) => !item.visited);
        }
        // 優先度フィルター
        const filterPriority = get().priorityFilter;
        if (filterPriority !== null) {
          list = list.filter((item) => item.priority >= filterPriority);
        }
        // 評価フィルター
        const filterRating = get().ratingFilter;
        if (filterRating !== null) {
          list = list.filter((item) => Math.round(item.spot.meta.rating) >= filterRating);
        }
        return list;
      },
      setPrefectureFilter(pref: string | null) {
        set((state) => {
          state.prefectureFilter = pref;
        });
      },
      setPriorityFilter(val: number | null) {
        set((state) => {
          state.priorityFilter = val;
        });
      },
      setRatingFilter(val: number | null) {
        set((state) => {
          state.ratingFilter = val;
        });
      },
      isAlreadyAddedWishlist(id) {
        return get().wishlist.filter((val) => val.spotId == id).length != 0;
      },
      addWishlist(wishlist) {
        set((state) => {
          state.wishlist.push(wishlist);
        });
      },
      updateWishlist(wishlist) {
        set((state) => {
          const index = state.wishlist.findIndex((val) => val.id === wishlist.id);
          if (index !== -1) {
            state.wishlist[index] = wishlist;
          }
        });
      },
      getSearchCenter() {
        return get().searchCenter;
      },
      setSearchCenter(center) {
        set((state) => {
          state.searchCenter = center;
        });
      },
      getSelectMapOpen() {
        return get().mapSelectOpen;
      },
      setSelectMapOpen(check) {
        set((state) => {
          state.mapSelectOpen = check;
        });
      },
      getSearchRadius() {
        return get().searchRadius;
      },
      setSearchRadius(radius) {
        set((state) => {
          state.searchRadius = radius;
        });
      },
      getSelectedSpot() {
        return get().selectedSpot;
      },
      setSelectedSpot(spot) {
        set((state) => {
          state.selectedSpot = spot;
        });
      },
      getSelectedWishlist() {
        return get().selectedWishlist;
      },
      setSelectedWishlist(wishlist) {
        set((state) => {
          state.selectedWishlist = wishlist;
        });
      },
      getAreaSearchResults() {
        return get().areaSearchResults;
      },
      setAreaSearchResults(results) {
        set((state) => {
          state.areaSearchResults = results;
        });
      },
      getKeywordSearchResults() {
        return get().keywordSearchResults;
      },
      setKeywordSearchResults(results) {
        set((state) => {
          state.keywordSearchResults = results;
        });
      },
      getAreaMapCenter() {
        return get().areaMapCenter;
      },
      setAreaMapCenter(center) {
        set((state) => {
          state.areaMapCenter = center;
        });
      },
      getKeywordMapCenter() {
        return get().keywordMapCenter;
      },
      setKeywordMapCenter(center) {
        set((state) => {
          state.keywordMapCenter = center;
        });
      },
      getSearchKeyword() {
        return get().searchKeyword.trim();
      },
      setSearchKeyword(keyword) {
        set((state) => {
          state.searchKeyword = keyword;
        });
      },
      getSearchCategories() {
        return get().searchCategories;
      },
      setSearchCategories(categoryId) {
        set((state) => {
          state.searchCategories = state.searchCategories.includes(categoryId)
            ? state.searchCategories.filter((id) => id !== categoryId)
            : [...state.searchCategories, categoryId];
        });
      },
      getShowAdvanced() {
        return get().showAdvanced;
      },
      setShowAdvanced(check) {
        set((state) => {
          state.showAdvanced = check;
        });
      },
      getHighRating() {
        return get().highRating;
      },
      setHighRating(check) {
        set((state) => {
          state.highRating = check;
        });
      },
    })),
  ),
);
