import React, { useState } from 'react';
import { Search, Loader } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchSpots } from '@/lib/plan';
import { useWishlistStore } from '@/store/wishlist/wishlistStore';

import SearchResultsView from './SearchResultsView';

const KeywordSearchWithMap = () => {
  const keywordSearchResults = useWishlistStore((state) => state.keywordSearchResults);
  const setKeywordSearchResults = useWishlistStore((state) => state.setKeywordSearchResults);
  const keywordMapCenter = useWishlistStore((state) => state.keywordMapCenter);
  const setKeywordMapCenter = useWishlistStore((state) => state.setKeywordMapCenter);
  const searchQuery = useWishlistStore((state) => state.searchKeyword);
  const setSearchQuery = useWishlistStore((state) => state.setSearchKeyword);
  const [isSearching, setIsSearching] = useState(false);

  // テキスト検索
  const handleSearch = async () => {
    if (!searchQuery.length) return;

    setIsSearching(true);
    try {
      const searchedSpots = await searchSpots({
        searchWord: searchQuery,
        maxResultLimit: 20,
        sortOption: 'popularity',
        center: undefined,
        radius: 10 * 1000,
      });
      setKeywordSearchResults(searchedSpots);
      if (searchedSpots.length > 0) {
        setKeywordMapCenter(searchedSpots[0].location);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">キーワードを入力</Label>
        <div className="flex gap-2">
          <Input
            placeholder="例: 渋谷 カフェ"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
          <Button onClick={handleSearch} disabled={isSearching || !searchQuery.length} size="sm">
            {isSearching ? (
              <Loader className="animate-spin" size={16} />
            ) : (
              <>
                <Search size={16} className="mr-1" />
                検索
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500">スポット名や場所で検索、または地図をクリックして周辺のスポットを表示</p>
      </div>

      {/* Search Results */}
      <SearchResultsView searchResults={keywordSearchResults} mapCenter={keywordMapCenter} searchType="keyword" />
    </div>
  );
};

export default KeywordSearchWithMap;
