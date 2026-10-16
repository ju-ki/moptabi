'use client';

import { useState, type ReactNode } from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';

import AddressSearch from '@/components/AddressSearch';
import { cn } from '@/lib/utils';
import { MAP_SEARCH_MESSAGE } from '@/data/constants';
import { Coordination, MapCenterCandidate } from '@/types/plan';

type MapCenterPickerProps = {
  candidates: MapCenterCandidate[];
  /** 今の基準名。押した候補を強調するのに使う */
  activeLabel: string | null;
  /** 中心を移す。label は距離表示の基準名（住所検索は null で「中心から」） */
  onCenterChange: (center: Coordination, label: string | null) => void;
  /** スマホで住所欄の右に置く部品（表示するピンのボタン） */
  trailing?: ReactNode;
};

/**
 * 地図で探すの中心を選ぶ（No.341）
 * PC: 候補をチップで並べ、その下に住所欄
 * スマホ: 住所欄だけを1行で出し、住所欄にフォーカスしたときだけ候補をリストで出す
 */
export function MapCenterPicker({ candidates, activeLabel, onCenterChange, trailing }: MapCenterPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 現在地は押したときだけ取得する（開いただけで位置情報の許可を求めない）
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(MAP_SEARCH_MESSAGE.CURRENT_LOCATION_UNSUPPORTED);
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onCenterChange(
          {
            id: 'current-location',
            name: MAP_SEARCH_MESSAGE.CURRENT_LOCATION,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          MAP_SEARCH_MESSAGE.CURRENT_LOCATION,
        );
      },
      () => {
        setIsLocating(false);
        setLocationError(MAP_SEARCH_MESSAGE.CURRENT_LOCATION_ERROR);
      },
      { timeout: 10000 },
    );
  };

  const chipClass = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-sm transition-colors text-left',
      'max-sm:w-full max-sm:rounded-md max-sm:border-0 max-sm:px-3 max-sm:py-2',
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
    );

  return (
    <div className="group relative space-y-2 sm:space-y-3">
      <p className="text-sm font-semibold text-gray-700 max-sm:hidden">{MAP_SEARCH_MESSAGE.CENTER_HEADING}</p>

      {/* 候補: PC は常に表示。スマホは住所欄（このブロック内）にフォーカスがあるときだけ表示 */}
      <div
        role="list"
        aria-label={MAP_SEARCH_MESSAGE.CENTER_HEADING}
        className={cn(
          'flex flex-wrap gap-2',
          'max-sm:hidden max-sm:group-focus-within:flex max-sm:absolute max-sm:inset-x-0 max-sm:top-full max-sm:z-20',
          'max-sm:mt-1 max-sm:max-h-64 max-sm:flex-col max-sm:flex-nowrap max-sm:gap-0 max-sm:overflow-y-auto',
          'max-sm:rounded-md max-sm:border max-sm:bg-background max-sm:shadow-lg',
        )}
      >
        {candidates.map((candidate) => (
          <div role="listitem" key={candidate.id}>
            <button
              type="button"
              className={chipClass(activeLabel === candidate.label)}
              onClick={() =>
                onCenterChange(
                  { id: candidate.id, name: candidate.name, lat: candidate.lat, lng: candidate.lng },
                  candidate.label,
                )
              }
            >
              {candidate.label}
            </button>
          </div>
        ))}
        <div role="listitem">
          <button
            type="button"
            className={cn(chipClass(activeLabel === MAP_SEARCH_MESSAGE.CURRENT_LOCATION), 'flex items-center gap-1')}
            onClick={handleCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            {MAP_SEARCH_MESSAGE.CURRENT_LOCATION}
          </button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 max-sm:[&_label]:sr-only">
          <AddressSearch
            label={MAP_SEARCH_MESSAGE.ADDRESS_LABEL}
            placeholder={MAP_SEARCH_MESSAGE.ADDRESS_PLACEHOLDER}
            onCoordinateFound={(coord) => onCenterChange(coord, null)}
          />
        </div>
        {trailing && <div className="sm:hidden">{trailing}</div>}
      </div>

      {locationError && <p className="text-sm text-red-500">{locationError}</p>}
    </div>
  );
}

export default MapCenterPicker;
