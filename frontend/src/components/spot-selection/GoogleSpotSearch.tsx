'use client';

import { useState, useEffect, useMemo } from 'react';
import { LocateFixed, Route, Loader2 } from 'lucide-react';

import { Spot, ExtendSpotType } from '@/types/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchResultsView } from '@/components/common/SearchResultsView';
import { LocationAdjustModal } from '@/components/common/LocationAdjustModal';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { useStoreForPlanning } from '@/lib/plan';
import { searchSpots } from '@/lib/plan';
import { setStartTimeAutomatically } from '@/lib/algorithm';
import { calcMidpoint } from '@/lib/geo';
import { useCurrentLocation } from '@/hooks/spot-search/use-current-location';
import { Coordination } from '@/types/plan';

type CenterMode = 'current-location' | 'plan-location';

type PlanPoint = { id: string; name: string; lat: number; lng: number };

const THEMES = [
  { id: 'gourmet', label: 'グルメ' },
  { id: 'sightseeing', label: '観光・文化' },
  { id: 'history', label: '歴史・神社' },
  { id: 'nature', label: '自然・公園' },
  { id: 'shopping', label: 'ショッピング' },
  { id: 'leisure', label: '体験・レジャー' },
];

const THEME_TO_CATEGORIES: Record<string, string[]> = {
  gourmet: ['restaurant', 'cafe', 'bakery'],
  sightseeing: ['tourist_attraction', 'museum', 'art_gallery', 'zoo', 'aquarium'],
  history: ['historical_place'],
  nature: ['park'],
  shopping: ['shopping_mall', 'store'],
  leisure: ['amusement_park', 'bowling_alley', 'movie_theater', 'spa'],
};

type GoogleSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: ExtendSpotType, isDeleted: boolean) => void;
};

export function GoogleSpotSearch({ date, selectedSpotIds, onSpotSelect }: GoogleSpotSearchProps) {
  const [centerMode, setCenterMode] = useState<CenterMode>('current-location');
  const [isSearching, setIsSearching] = useState(false);
  const [mapSelectOpen, setMapSelectOpen] = useState(false);

  const {
    searchCenter,
    setSearchCenter,
    searchRadius,
    setSearchRadius,
    searchKeyword,
    setSearchKeyword,
    searchResults,
    setSearchResults,
    highRating,
    setHighRating,
    selectedThemes,
    setSelectedThemes,
    planSpotSelection,
    togglePlanSpotSelection,
    clearPlanSpotSelection,
  } = useSpotSearchStore();

  const { plans } = useStoreForPlanning();
  const { currentLocation, isLocating } = useCurrentLocation();

  const currentPlan = useMemo(() => plans.find((p) => p.date === date), [plans, date]);
  const planSpots = useMemo(() => currentPlan?.spots ?? [], [currentPlan]);

  // 出発地・目的地・プランスポットを統合した地点リスト
  const planPoints = useMemo((): PlanPoint[] => {
    const points: PlanPoint[] = [];
    const dep = currentPlan?.departure;
    if (dep?.latitude != null && dep?.longitude != null) {
      points.push({ id: 'departure', name: dep.name + ' (出発地)', lat: dep.latitude, lng: dep.longitude });
    }
    const dest = currentPlan?.destination;
    if (dest?.latitude != null && dest?.longitude != null) {
      points.push({ id: 'destination', name: dest.name + ' (目的地)', lat: dest.latitude, lng: dest.longitude });
    }
    for (const s of planSpots) {
      points.push({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude });
    }
    return points;
  }, [currentPlan, planSpots]);

  // モード・選択変化時に searchCenter を同期
  useEffect(() => {
    if (centerMode === 'current-location' && currentLocation) {
      setSearchCenter(currentLocation);
    } else if (centerMode === 'plan-location') {
      const selected = planPoints.filter((p) => planSpotSelection.includes(p.id));
      const toCoord = (p: PlanPoint): Coordination => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng });
      if (selected.length === 1) {
        setSearchCenter(toCoord(selected[0]));
      } else if (selected.length === 2) {
        setSearchCenter(calcMidpoint(toCoord(selected[0]), toCoord(selected[1])));
      }
    }
  }, [centerMode, currentLocation, planPoints, planSpotSelection]);

  const effectiveCenter = searchCenter;

  // 地図上に参照マーカーとして表示する選択済み地点（plan-locationモード時）
  const mapSubPoints = useMemo((): Coordination[] => {
    if (centerMode !== 'plan-location' || planSpotSelection.length < 2) return [];
    return planPoints
      .filter((p) => planSpotSelection.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
  }, [centerMode, planPoints, planSpotSelection]);

  const convertToExtendSpotType = (spots: Spot[]): ExtendSpotType[] =>
    spots.map((spot) => ({
      ...spot,
      spotId: spot.id,
      rating: spot.rating ?? 0,
      name: spot.location.name,
      latitude: spot.location.lat,
      longitude: spot.location.lng,
      transportMethod: 'DEFAULT',
      transportMethodId: 0,
      travelTime: 0,
      stayDuration: 60,
      order: 0,
    }));

  const handleSearch = async () => {
    if (!effectiveCenter) return;
    setIsSearching(true);
    try {
      const genreIds = selectedThemes.flatMap((t) => THEME_TO_CATEGORIES[t] ?? []);
      const spots = await searchSpots({
        center: effectiveCenter,
        genreIds: genreIds.length > 0 ? genreIds : undefined,
        searchWord: searchKeyword || undefined,
        radius: searchRadius[0],
        sortOption: centerMode === 'plan-location' ? 'distance' : 'popularity',
        maxResultLimit: 20,
      });
      const filtered = highRating ? spots.filter((s) => s.rating && s.rating >= 4) : spots;
      setSearchResults(filtered);
    } catch (error) {
      // TODO: エラー状態をstateで管理し、UIに表示する処理を追加する
      console.error('検索エラー:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSpotClick = (spot: ExtendSpotType) => {
    const isSelected = selectedSpotIds.includes(spot.id);
    if (!isSelected) {
      const updatedSpot = setStartTimeAutomatically(spot, planSpots);
      onSpotSelect(updatedSpot, false);
    } else {
      onSpotSelect(spot, true);
    }
  };

  const toggleTheme = (themeId: string) => {
    setSelectedThemes(
      selectedThemes.includes(themeId) ? selectedThemes.filter((id) => id !== themeId) : [...selectedThemes, themeId],
    );
  };

  return (
    <div className="space-y-4">
      {/* ① 検索中心点モード選択 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">検索の基準</Label>
        <RadioGroup value={centerMode} onValueChange={(v) => setCenterMode(v as CenterMode)} className="flex  gap-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="current-location" id="mode-current" />
            <Label htmlFor="mode-current" className="flex items-center gap-1 cursor-pointer">
              <LocateFixed className="h-4 w-4" />
              現在地
              {isLocating && <Loader2 className="animate-spin h-3 w-3 ml-1" />}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="plan-location" id="mode-plan-loc" />
            <Label htmlFor="mode-plan-loc" className="flex items-center gap-1 cursor-pointer">
              <Route className="h-4 w-4" />
              出発地/目的地/スポットの地点付近
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* プランの地点付近: 統合バッジ選択（最大2件） */}
      {centerMode === 'plan-location' && (
        <div className="space-y-2">
          <Label className="text-sm">
            基準にする地点
            <span className="text-muted-foreground ml-2 text-xs">1つ→付近 / 2つ→中間地点</span>
          </Label>
          <div className="flex flex-wrap gap-2" data-testid="plan-spot-badges">
            {planPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">出発地・目的地・スポットが登録されていません</p>
            ) : (
              planPoints.map((point) => (
                <Badge
                  key={point.id}
                  variant={planSpotSelection.includes(point.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePlanSpotSelection(point.id)}
                  data-testid={`plan-spot-badge-${point.id}`}
                >
                  {point.name}
                </Badge>
              ))
            )}
          </div>
          {planSpotSelection.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearPlanSpotSelection}>
              選択をクリア
            </Button>
          )}
          {planSpotSelection.length > 0 && searchCenter && (
            <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded" data-testid="plan-spot-center-info">
              {planSpotSelection.length === 1
                ? `「${planPoints.find((p) => p.id === planSpotSelection[0])?.name}」付近を検索`
                : `「${planPoints.find((p) => p.id === planSpotSelection[0])?.name}」と「${planPoints.find((p) => p.id === planSpotSelection[1])?.name}」の中間地点付近を検索`}
            </p>
          )}
        </div>
      )}

      {/* ② 検索パネル: キーワード + 高評価フィルター（横並び）+ テーマ */}
      <div className="space-y-2 border rounded-md p-3 bg-muted/30">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-sm">キーワード（任意）</Label>
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="例: カフェ、展望台"
              className="mt-1"
              data-testid="keyword-input"
            />
          </div>
          <label
            className={`flex items-center gap-2 pb-1.5 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${
              highRating ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
            }`}
          >
            <Checkbox
              checked={highRating}
              onCheckedChange={() => setHighRating(!highRating)}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-sm font-medium whitespace-nowrap">評価4.0以上</span>
          </label>
        </div>
        <div>
          <Label className="text-sm mb-1 block">テーマ</Label>
          <div className="flex flex-wrap gap-1" data-testid="theme-chips">
            {THEMES.map((t) => (
              <Badge
                key={t.id}
                variant={selectedThemes.includes(t.id) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => toggleTheme(t.id)}
                data-testid={`theme-chip-${t.id}`}
              >
                {t.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* ③ 検索範囲 */}
      <div className="space-y-2">
        <Label className="text-sm">検索範囲: {searchRadius[0]}km</Label>
        <Slider value={searchRadius} onValueChange={setSearchRadius} max={15} min={1} step={1} />
      </div>

      {/* 地図で位置を調整（両モード共通） */}
      <Button variant="outline" onClick={() => setMapSelectOpen(true)} className="w-full">
        地図で位置を調整
      </Button>
      <LocationAdjustModal
        open={mapSelectOpen}
        onOpenChange={setMapSelectOpen}
        searchCenter={searchCenter}
        onSearchCenterChange={setSearchCenter}
        searchRadius={searchRadius}
        onConfirm={handleSearch}
        subPoints={mapSubPoints}
      />

      <Button
        onClick={handleSearch}
        disabled={isSearching || !effectiveCenter}
        className="w-full"
        data-testid="search-button"
      >
        {isSearching ? '検索中...' : '検索する'}
      </Button>

      {/* 検索結果 */}
      <SearchResultsView
        spots={convertToExtendSpotType(searchResults)}
        selectedSpotIds={selectedSpotIds}
        onSpotClick={handleSpotClick}
      />
      {searchResults.length === 0 && !isSearching && (
        <div className="text-center text-gray-500 py-8">検索結果がありません</div>
      )}
    </div>
  );
}

export default GoogleSpotSearch;
