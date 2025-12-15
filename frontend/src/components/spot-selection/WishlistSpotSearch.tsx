'use client';

import { Loader, ArrowUpDown } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SearchResultsView } from '@/components/common/SearchResultsView';
import { useWishlistSpots } from '@/hooks/spot-search/use-wishlist-spots';
import { prefectures } from '@/data/constants';
import { Spot } from '@/types/plan';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';

// TODO: dateは営業時間のフィルターで使用予定
type WishlistSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: Spot, isDeleted: boolean) => void;
};

export function WishlistSpotSearch({ date, selectedSpotIds, onSpotSelect }: WishlistSpotSearchProps) {
  const spotSearchStore = useSpotSearchStore();
  const { spots, isLoading, error } = useWishlistSpots({
    prefecture:
      spotSearchStore.wishlistPrefectureFilter === 'all' ? undefined : spotSearchStore.wishlistPrefectureFilter,
    priority:
      spotSearchStore.wishlistPriorityFilter === 99 ? undefined : Number(spotSearchStore.wishlistPriorityFilter),
    sortBy: spotSearchStore.wishlistSortBy,
    sortOrder: spotSearchStore.wishlistSortOrder,
  });

  const handleSpotClick = (spot: Spot) => {
    const isSelected = selectedSpotIds.includes(spot.id);
    onSpotSelect(spot, isSelected);
  };

  // ソート順をトグルする
  const toggleSortOrder = () => {
    spotSearchStore.setWishlistSortOrder(spotSearchStore.wishlistSortOrder === 'desc' ? 'asc' : 'desc');
  };

  if (isLoading || !spots) {
    return (
      <div className="flex items-center justify-center h-40" data-testid="loading-spinner">
        <Loader className="animate-spin" size={24} />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-sm">エラーが発生しました: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>都道府県</Label>
          <Select
            value={spotSearchStore.wishlistPrefectureFilter}
            onValueChange={spotSearchStore.setWishlistPrefectureFilter}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {prefectures.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>優先度</Label>
          <Select
            value={spotSearchStore.wishlistPriorityFilter.toString()}
            onValueChange={(value) => spotSearchStore.setWishlistPriorityFilter(value === '99' ? 99 : Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="99">すべて</SelectItem>
              <SelectItem value="1">優先度:1</SelectItem>
              <SelectItem value="2">優先度:2</SelectItem>
              <SelectItem value="3">優先度:3</SelectItem>
              <SelectItem value="4">優先度:4</SelectItem>
              <SelectItem value="5">優先度:5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>並び順</Label>
          <Select
            value={spotSearchStore.wishlistSortBy}
            onValueChange={(value: 'priority' | 'createdAt') => spotSearchStore.setWishlistSortBy(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">優先度順</SelectItem>
              <SelectItem value="createdAt">追加日順</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>ソート方向</Label>
          <button
            type="button"
            onClick={toggleSortOrder}
            className="flex items-center gap-2 w-full h-10 px-3 border rounded-md bg-background hover:bg-accent transition-colors"
            aria-label={spotSearchStore.wishlistSortOrder === 'desc' ? '降順' : '昇順'}
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{spotSearchStore.wishlistSortOrder === 'desc' ? '降順（高い順）' : '昇順（低い順）'}</span>
          </button>
        </div>
      </div>

      {/* 検索結果 */}
      <SearchResultsView spots={spots} selectedSpotIds={selectedSpotIds} onSpotClick={handleSpotClick} />

      {spots.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-8">行きたいリストにスポットが登録されていません</div>
      )}
    </div>
  );
}

export default WishlistSpotSearch;
