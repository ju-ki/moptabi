'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MAP_SEARCH_MESSAGE } from '@/data/constants';
import { saveMapPinLayers } from '@/lib/map-pin-layers';
import { cn } from '@/lib/utils';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { MapPinLayers } from '@/types/plan';

type MapPinLayerToggleProps = {
  /** スマホでシートを開いているか（PC は常に表示） */
  isSheetOpen: boolean;
  onSheetClose: () => void;
  /** 座標を取得していない過去のスポットの件数 */
  visitedRemainingCount: number;
  onVisitedLoadMore: () => void;
};

/**
 * 地図で探すの「表示するピン」（No.341）
 * PC: 左パネルのチェック / スマホ: 「ピン」ボタンで開く下部シート
 * ON/OFF は localStorage に保存し、次に開いたときに復元する
 */
export function MapPinLayerToggle({
  isSheetOpen,
  onSheetClose,
  visitedRemainingCount,
  onVisitedLoadMore,
}: MapPinLayerToggleProps) {
  const { pinLayers, setPinLayers, openOnPlanDate, setOpenOnPlanDate } = useSpotSearchStore();

  const toggleLayer = (key: keyof MapPinLayers) => {
    const next = { ...pinLayers, [key]: !pinLayers[key] };
    setPinLayers(next);
    saveMapPinLayers(next);
  };

  const items = [
    { key: 'wishlist' as const, label: MAP_SEARCH_MESSAGE.PIN_WISHLIST },
    { key: 'visited' as const, label: MAP_SEARCH_MESSAGE.PIN_VISITED },
  ];

  return (
    <div
      className={cn(
        'space-y-2',
        isSheetOpen
          ? 'max-sm:absolute max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:rounded-t-xl max-sm:border max-sm:bg-background max-sm:p-4 max-sm:shadow-lg'
          : 'max-sm:hidden',
      )}
      data-testid="map-pin-layer-toggle"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{MAP_SEARCH_MESSAGE.PIN_HEADING}</p>
        <button
          type="button"
          onClick={onSheetClose}
          aria-label={MAP_SEARCH_MESSAGE.CLOSE}
          className="text-muted-foreground hover:text-foreground sm:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {items.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={pinLayers[key]} onCheckedChange={() => toggleLayer(key)} aria-label={label} />
          {label}
        </label>
      ))}
      {pinLayers.visited && visitedRemainingCount > 0 && (
        <div className="flex items-center justify-between gap-2 pl-6 text-xs text-muted-foreground">
          <span>{MAP_SEARCH_MESSAGE.PIN_VISITED_REMAINING.replace(':count', String(visitedRemainingCount))}</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onVisitedLoadMore}>
            {MAP_SEARCH_MESSAGE.PIN_LOAD_MORE}
          </Button>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox
          checked={openOnPlanDate}
          onCheckedChange={() => setOpenOnPlanDate(!openOnPlanDate)}
          aria-label={MAP_SEARCH_MESSAGE.PIN_HIDE_CLOSED}
        />
        {MAP_SEARCH_MESSAGE.PIN_HIDE_CLOSED}
      </label>
    </div>
  );
}

export default MapPinLayerToggle;
