'use client';

import { Loader, ArrowUpDown, Calendar } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SearchResultsView } from '@/components/common/SearchResultsView';
import { useVisitedSpots } from '@/hooks/spot-search/use-visited-spots';
import { prefectures } from '@/data/constants';
import { Spot } from '@/types/plan';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';

// TODO: dateは営業時間のフィルターで使用予定
type VisitedSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: Spot, isDeleted: boolean) => void;
};

/**
 * Render a filterable list of previously visited or planned spots.
 *
 * Renders UI controls for filtering by prefecture, visit count, date range, and sort options,
 * fetches matching visited spots, and displays them with selection handling.
 *
 * @param date - Current reference date (ISO string) used by the parent; not directly modified by this component
 * @param selectedSpotIds - Array of spot IDs that are currently selected; used to determine toggle/delete state when a spot is clicked
 * @param onSpotSelect - Called when a spot is clicked. Receives the `spot` and a boolean indicating whether the spot was already selected (true if it was selected and will be removed)
 * @returns The rendered VisitedSpotSearch React element
 */
export function VisitedSpotSearch({ date, selectedSpotIds, onSpotSelect }: VisitedSpotSearchProps) {
  const spotSearchStore = useSpotSearchStore();
  const { spots, isLoading, error } = useVisitedSpots({
    prefecture: spotSearchStore.visitedPrefectureFilter === 'all' ? undefined : spotSearchStore.visitedPrefectureFilter,
    dateFrom: spotSearchStore.visitedDateFrom || undefined,
    dateTo: spotSearchStore.visitedDateTo || undefined,
    minVisitCount: spotSearchStore.visitedMinVisitCount > 0 ? spotSearchStore.visitedMinVisitCount : undefined,
    sortBy: spotSearchStore.visitedSortBy,
    sortOrder: spotSearchStore.visitedSortOrder,
  });

  const handleSpotClick = (spot: Spot) => {
    const isSelected = selectedSpotIds.includes(spot.id);
    onSpotSelect(spot, isSelected);
  };

  // ソート順をトグルする
  const toggleSortOrder = () => {
    spotSearchStore.setVisitedSortOrder(spotSearchStore.visitedSortOrder === 'desc' ? 'asc' : 'desc');
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
      {/* フィルター - 1行目 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>都道府県</Label>
          <Select
            value={spotSearchStore.visitedPrefectureFilter}
            onValueChange={spotSearchStore.setVisitedPrefectureFilter}
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
          <Label>最小訪問回数</Label>
          <Select
            value={spotSearchStore.visitedMinVisitCount.toString()}
            onValueChange={(value) => spotSearchStore.setVisitedMinVisitCount(Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">すべて</SelectItem>
              <SelectItem value="2">2回以上</SelectItem>
              <SelectItem value="3">3回以上</SelectItem>
              <SelectItem value="5">5回以上</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>並び順</Label>
          <Select
            value={spotSearchStore.visitedSortBy}
            onValueChange={(value: 'visitedAt' | 'createdAt' | 'planDate' | 'visitCount') =>
              spotSearchStore.setVisitedSortBy(value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visitedAt">訪問日順</SelectItem>
              <SelectItem value="planDate">計画日順</SelectItem>
              <SelectItem value="visitCount">訪問回数順</SelectItem>
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
            aria-label={spotSearchStore.visitedSortOrder === 'desc' ? '降順' : '昇順'}
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{spotSearchStore.visitedSortOrder === 'desc' ? '降順（新しい順）' : '昇順（古い順）'}</span>
          </button>
        </div>
      </div>

      {/* フィルター - 2行目: 期間フィルター */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            <Calendar className="inline mr-1 h-4 w-4" />
            開始日
          </Label>
          <Input
            type="date"
            value={spotSearchStore.visitedDateFrom}
            onChange={(e) => spotSearchStore.setVisitedDateFrom(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>
            <Calendar className="inline mr-1 h-4 w-4" />
            終了日
          </Label>
          <Input
            type="date"
            value={spotSearchStore.visitedDateTo}
            onChange={(e) => spotSearchStore.setVisitedDateTo(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* 検索結果 */}
      <SearchResultsView
        spots={spots}
        selectedSpotIds={selectedSpotIds}
        onSpotClick={handleSpotClick}
        cardType="visited"
      />

      {spots.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-8">過去に訪問・計画したスポットがありません</div>
      )}
    </div>
  );
}

export default VisitedSpotSearch;