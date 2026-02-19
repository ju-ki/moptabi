'use client';

import { useState } from 'react';
import { MapPin, Search } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchResultsView } from '@/components/common/SearchResultsView';
import { LocationAdjustModal } from '@/components/common/LocationAdjustModal';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { useStoreForPlanning } from '@/lib/plan';
import { searchSpots } from '@/lib/plan';
import { prefectureCenters, prefectures } from '@/data/constants';
import { setStartTimeAutomatically } from '@/lib/algorithm';
import { Spot } from '@/types/plan';

type GoogleSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: Spot, isDeleted: boolean) => void;
};

export function GoogleSpotSearch({ date, selectedSpotIds, onSpotSelect }: GoogleSpotSearchProps) {
  const [searchType, setSearchType] = useState<'area' | 'keyword'>('area');
  const [isSearching, setIsSearching] = useState(false);
  const [mapSelectOpen, setMapSelectOpen] = useState(false);

  // Zustand から検索条件を取得（wishlistStore のパターンを活用）
  const {
    searchCenter,
    setSearchCenter,
    searchRadius,
    setSearchRadius,
    searchCategories,
    setSearchCategories,
    searchKeyword,
    setSearchKeyword,
    searchResults,
    setSearchResults,
    highRating,
    setHighRating,
  } = useSpotSearchStore();

  const { plans } = useStoreForPlanning();

  const categories = [
    { id: 'tourist_attraction', label: '観光スポット' },
    { id: 'restaurant', label: 'グルメ' },
    { id: 'museum', label: '美術館・博物館' },
    { id: 'park', label: '公園・自然' },
    { id: 'historical_place', label: '歴史文化' },
    { id: 'amusement_park', label: 'レジャー' },
  ];

  const handleAreaSearch = async () => {
    setIsSearching(true);
    try {
      const spots = await searchSpots({
        center: searchCenter,
        genreIds: searchCategories,
        radius: searchRadius[0],
        sortOption: 'popularity',
        maxResultLimit: 20,
      });

      const filtered = highRating ? spots.filter((s) => s.rating && s.rating >= 4) : spots;
      setSearchResults(filtered);
    } catch (error) {
      // TODO: エラー状態をstateで管理し、UIに表示する処理を追加する
      // 現在はコンソールエラーのみ出力
      console.error('検索エラー:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeywordSearch = async () => {
    if (!searchKeyword) return;

    setIsSearching(true);
    try {
      const spots = await searchSpots({
        radius: searchRadius[0],
        searchWord: searchKeyword,
        maxResultLimit: 20,
        sortOption: 'popularity',
      });
      const filtered = highRating ? spots.filter((s) => s.rating && s.rating >= 4) : spots;
      setSearchResults(filtered);
    } catch (error) {
      // TODO: エラー状態をstateで管理し、UIに表示する処理を追加する
      // 現在はコンソールエラーのみ出力
      console.error('検索エラー:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSpotClick = (spot: Spot) => {
    const isSelected = selectedSpotIds.includes(spot.id);
    if (!isSelected) {
      // 自動的に滞在時間を設定（既存ロジック活用）
      const updatedSpot = setStartTimeAutomatically(spot, plans.find((p) => p.date === date)?.spots ?? []);
      onSpotSelect(updatedSpot, false);
    } else {
      onSpotSelect(spot, true);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={searchType} onValueChange={(v) => setSearchType(v as 'area' | 'keyword')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="area">
            <MapPin className="mr-2 h-4 w-4" />
            エリアで検索
          </TabsTrigger>
          <TabsTrigger value="keyword">
            <Search className="mr-2 h-4 w-4" />
            キーワード検索
          </TabsTrigger>
        </TabsList>

        {/* エリア検索 */}
        <TabsContent value="area" className="space-y-4">
          <Accordion type="single" collapsible defaultValue="conditions">
            <AccordionItem value="conditions">
              <AccordionTrigger>検索条件</AccordionTrigger>
              <AccordionContent className="space-y-4">
                {/* 都道府県選択 */}
                <div className="space-y-2">
                  <Label>都道府県</Label>
                  <Select
                    onValueChange={(v) => {
                      const center = prefectureCenters[v];
                      if (center) {
                        setSearchCenter(center);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {prefectures.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 検索範囲 */}
                <div className="space-y-2">
                  <Label>検索範囲: {searchRadius[0]}km</Label>
                  <Slider value={searchRadius} onValueChange={setSearchRadius} max={10} min={1} step={1} />
                </div>

                {/* 位置調整ボタン */}
                <Button variant="outline" onClick={() => setMapSelectOpen(true)} className="w-full">
                  <MapPin className="mr-2 h-4 w-4" />
                  地図で位置を調整
                </Button>

                {/* 位置調整モーダル */}
                <LocationAdjustModal
                  open={mapSelectOpen}
                  onOpenChange={setMapSelectOpen}
                  searchCenter={searchCenter}
                  onSearchCenterChange={setSearchCenter}
                  searchRadius={searchRadius}
                  onConfirm={handleAreaSearch}
                />

                {/* カテゴリ選択 */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">カテゴリ</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          searchCategories.includes(cat.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <Checkbox
                          checked={searchCategories.includes(cat.id)}
                          onCheckedChange={() => setSearchCategories(cat.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                        <span className="text-sm">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 高評価フィルター */}
                <div className="pt-2 border-t">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      highRating ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <Checkbox
                      checked={highRating}
                      onCheckedChange={() => setHighRating(!highRating)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">評価4.0以上のみ</span>
                      <span className="text-xs text-muted-foreground">★★★★</span>
                    </div>
                  </label>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button onClick={handleAreaSearch} disabled={isSearching} className="w-full">
            {isSearching ? '検索中...' : '検索する'}
          </Button>
        </TabsContent>

        {/* キーワード検索 */}
        <TabsContent value="keyword" className="space-y-4">
          <div className="space-y-2">
            <Label>キーワード</Label>
            <div className="flex gap-2">
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="例: 渋谷 カフェ"
              />
              <Button onClick={handleKeywordSearch} disabled={isSearching || !searchKeyword}>
                検索する
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 検索結果表示（wishlist の SearchResultsView を再利用） */}
      <SearchResultsView spots={searchResults} selectedSpotIds={selectedSpotIds} onSpotClick={handleSpotClick} />
      {searchResults.length === 0 && !isSearching && (
        <div className="text-center text-gray-500 py-8">検索結果がありません</div>
      )}
    </div>
  );
}

export default GoogleSpotSearch;
