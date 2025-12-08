import React, { useState } from 'react';
import { ChevronDown, Loader, MapPin, Search, SlidersHorizontal } from 'lucide-react';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import { prefectureCenters, prefectures } from '@/data/constants';
import { searchSpots } from '@/lib/plan';

import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';
import SearchResultsView from './SearchResultsView';
import LocationAdjustModal from './LocationAdjustModal';

const AreaSearch = () => {
  const mapSelectOpen = useWishlistStore((state) => state.mapSelectOpen);
  const setMapSelectOpen = useWishlistStore((state) => state.setSelectMapOpen);
  const searchCenter = useWishlistStore((state) => state.searchCenter);
  const setSearchCenter = useWishlistStore((state) => state.setSearchCenter);
  const searchRadius = useWishlistStore((state) => state.searchRadius);
  const setSearchRadius = useWishlistStore((state) => state.setSearchRadius);
  const searchCategories = useWishlistStore((state) => state.searchCategories);
  const setSearchCategories = useWishlistStore((state) => state.setSearchCategories);
  const areaSearchResults = useWishlistStore((state) => state.areaSearchResults);
  const setAreaSearchResults = useWishlistStore((state) => state.setAreaSearchResults);
  const areaMapCenter = useWishlistStore((state) => state.areaMapCenter);
  const setAreaMapCenter = useWishlistStore((state) => state.setAreaMapCenter);
  const showAdvanced = useWishlistStore((state) => state.showAdvanced);
  const setShowAdvanced = useWishlistStore((state) => state.setShowAdvanced);
  const highRating = useWishlistStore((state) => state.highRating);
  const setHighRating = useWishlistStore((state) => state.setHighRating);

  const [isSearching, setIsSearching] = useState(false);

  const categories = [
    { id: 'tourist_attraction', label: '観光スポット', icon: '🏛️' },
    { id: 'restaurant', label: 'レストラン', icon: '🍽️' },
    { id: 'cafe', label: 'カフェ', icon: '☕' },
    { id: 'museum', label: '美術館・博物館', icon: '🎨' },
    { id: 'park', label: '公園・自然', icon: '🌳' },
    { id: 'shopping', label: 'ショッピング', icon: '🛍️' },
    { id: 'temple', label: '寺社仏閣', icon: '⛩️' },
    { id: 'entertainment', label: 'エンタメ', icon: '🎭' },
  ];

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const searchedSpots = await searchSpots({
        center: searchCenter,
        genreIds: searchCategories,
        radius: searchRadius[0],
        sortOption: 'popularity',
        maxResultLimit: 20,
      });
      let finalResults = searchedSpots;
      if (highRating) {
        finalResults = searchedSpots.filter((spot) => spot.rating && spot.rating >= 4);
      } else {
        finalResults = searchedSpots;
      }
      setAreaSearchResults(finalResults);
      if (finalResults.length > 0) {
        setAreaMapCenter(finalResults[0].location);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label data-testid="test-location-label">場所を選択</Label>
        <Select
          data-testid="test-prefecture-select"
          onValueChange={(selectedPref) => setSearchCenter(prefectureCenters[selectedPref as string])}
        >
          <SelectTrigger>
            <SelectValue data-testid="test-prefecture-select-value" placeholder="都道府県を選択する" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {prefectures.map((pref) => (
                <SelectItem data-testid={`test-prefecture-select-item-${pref}`} value={pref} key={pref}>
                  {pref}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label data-testid="test-search-range">検索範囲: {searchRadius[0]}km</Label>
        <Slider
          data-testid="test-search-range-slider"
          value={searchRadius}
          onValueChange={setSearchRadius}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1km</span>
          <span>10km</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label data-testid="test-adjust-label">検索位置を調整（オプション）</Label>
          <Button data-testid="map-adjust-button" variant="ghost" size="sm" onClick={() => setMapSelectOpen(true)}>
            {mapSelectOpen ? '地図を閉じる' : '地図で調整'}
            <MapPin size={14} className="ml-2" />
          </Button>
        </div>
        <LocationAdjustModal onConfirm={handleSearch} />
      </div>

      <div className="space-y-2">
        <Label data-testid="test-categories-label">カテゴリ（複数選択可）</Label>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              data-testid={`category-${cat.id}`}
              onClick={() => setSearchCategories(cat.id)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                searchCategories.includes(cat.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-base sm:text-sm">{cat.icon}</span>
              <span className="text-xs sm:text-sm">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        data-testid="detail-button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <SlidersHorizontal size={16} />
        詳細設定
        <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              data-testid="high-rating-checkbox"
              id="high-rating"
              checked={highRating}
              onCheckedChange={() => setHighRating(!highRating)}
            />
            <Label data-testid="test-high-rating-label" htmlFor="high-rating" className="text-sm cursor-pointer">
              評価4.0以上
            </Label>
          </div>
        </div>
      )}

      <Button
        data-testid="search-button"
        onClick={handleSearch}
        className="w-full"
        size="lg"
        disabled={!searchCenter || isSearching}
      >
        <Search className="mr-2" size={18} />
        検索する
      </Button>

      {/* Search Results */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center h-full py-8 sm:py-12">
          <Loader className="animate-spin text-blue-500 mb-4" size={32} />
          <p className="text-sm text-gray-500">スポットを検索中...</p>
        </div>
      ) : areaSearchResults.length > 0 ? (
        <SearchResultsView searchResults={areaSearchResults} mapCenter={areaMapCenter} searchType="area" />
      ) : (
        <div className="flex flex-col items-center justify-center h-full py-8 sm:py-12 text-gray-400">
          <MapPin size={40} className="mb-3 sm:w-12 sm:h-12" />
          <p className="text-sm text-center">検索条件を設定して検索してください</p>
        </div>
      )}
    </div>
  );
};

export default AreaSearch;
