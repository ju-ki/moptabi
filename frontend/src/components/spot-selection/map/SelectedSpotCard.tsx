'use client';

import { Check, Loader2, Star, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { HolidayNote, OpeningHoursOfDay, OpeningStatusBadge } from '@/components/common/OpeningHoursInfo';
import { MAP_SEARCH_MESSAGE } from '@/data/constants';
import { LIMIT_FETCH_ERROR_MESSAGE } from '@/lib/limits';
import { calcDistanceKm, formatDistance } from '@/lib/geo';
import { checkOpeningStatus, getOpeningHoursOfDay, getWeekdayLabel } from '@/lib/opening-hours';
import { cn } from '@/lib/utils';
import { Coordination, ExtendSpotType } from '@/types/plan';

type SelectedSpotCardProps = {
  spot: ExtendSpotType | null;
  isLoading: boolean;
  error: string | null;
  date: string;
  /** 距離の起点（今の地図の中心） */
  center: Pick<Coordination, 'lat' | 'lng'>;
  /** 距離の基準名。null のときは「中心」 */
  basisLabel: string | null;
  isSelected: boolean;
  /** 直前にこの画面で追加したスポットか（「追加しました・取り消す」を出す） */
  isJustAdded: boolean;
  isLimitReached: boolean;
  limitsError: boolean;
  onAdd: (spot: ExtendSpotType) => void;
  onRemove: (spot: ExtendSpotType) => void;
  onClose: () => void;
  className?: string;
};

/** スマホの1行に出す営業時間の短文（休みのときは「土曜は休みの可能性」） */
const buildShortHours = (spot: ExtendSpotType, date: string) => {
  const status = checkOpeningStatus({ openingPeriods: spot.openingPeriods, businessStatus: spot.businessStatus, date });
  if (status.kind === 'CLOSED_DAY') {
    return MAP_SEARCH_MESSAGE.CLOSED_DAY_SHORT.replace(':weekday', getWeekdayLabel(date) ?? '');
  }
  if (status.kind === 'CLOSED_PERMANENTLY' || status.kind === 'CLOSED_TEMPORARILY') return null;
  return getOpeningHoursOfDay(spot.openingPeriods, date) ?? null;
};

/**
 * 地図で選択中のスポットのカード（No.341）
 * スマホ: 名前・バッジ / 「★評価 ・ {基準名}から{距離} ・ 営業時間」の1行 / ボタン の3段
 * PC: 上記に住所、計画日の営業時間、祝日の注記を加える
 */
export function SelectedSpotCard({
  spot,
  isLoading,
  error,
  date,
  center,
  basisLabel,
  isSelected,
  isJustAdded,
  isLimitReached,
  limitsError,
  onAdd,
  onRemove,
  onClose,
  className,
}: SelectedSpotCardProps) {
  if (!spot && !isLoading && !error) return null;

  const wrapperClass = cn('rounded-lg border bg-background p-3 shadow-sm space-y-2', className);

  if (!spot) {
    return (
      <div className={wrapperClass} data-testid="selected-spot-card">
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {MAP_SEARCH_MESSAGE.LOADING}
          </p>
        ) : (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  const status = checkOpeningStatus({ openingPeriods: spot.openingPeriods, businessStatus: spot.businessStatus, date });
  const basis = basisLabel ?? MAP_SEARCH_MESSAGE.MAP_CENTER_NAME;
  const distance = formatDistance(calcDistanceKm(center, { lat: spot.latitude, lng: spot.longitude }));
  const shortHours = buildShortHours(spot, date);
  const summaryItems = [
    spot.rating ? `★${spot.rating}` : null,
    MAP_SEARCH_MESSAGE.DISTANCE_FROM.replace(':basis', basis).replace(':distance', distance),
    shortHours,
  ].filter(Boolean);
  const isAddDisabled = limitsError || isLimitReached;

  return (
    <div className={wrapperClass} data-testid="selected-spot-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <p className="font-semibold truncate">{spot.name}</p>
          <OpeningStatusBadge status={status} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={MAP_SEARCH_MESSAGE.CLOSE}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* スマホ: 1行にまとめる */}
      <p className="text-xs text-gray-600 sm:hidden" data-testid="selected-spot-summary-sp">
        {summaryItems.join(' ・ ')}
      </p>

      {/* PC: 住所・距離・営業時間を分けて出す */}
      <div className="space-y-1 text-xs text-gray-600 max-sm:hidden" data-testid="selected-spot-summary-pc">
        <p className="flex items-center gap-1">
          {!!spot.rating && (
            <>
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{spot.rating}</span>
              <span>・</span>
            </>
          )}
          <span className="truncate">{spot.address}</span>
        </p>
        <p>{MAP_SEARCH_MESSAGE.DISTANCE_FROM_PC.replace(':basis', basis).replace(':distance', distance)}</p>
        <OpeningHoursOfDay openingPeriods={spot.openingPeriods} date={date} />
        <HolidayNote />
      </div>

      {isSelected && isJustAdded ? (
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-sm text-green-700">
            <Check className="h-4 w-4" />
            {MAP_SEARCH_MESSAGE.ADDED}
          </p>
          <Button variant="outline" size="sm" onClick={() => onRemove(spot)}>
            {MAP_SEARCH_MESSAGE.UNDO}
          </Button>
        </div>
      ) : isSelected ? (
        <Button variant="outline" className="w-full" onClick={() => onRemove(spot)}>
          {MAP_SEARCH_MESSAGE.REMOVE}
        </Button>
      ) : (
        <div className="space-y-1">
          <Button className="w-full" onClick={() => onAdd(spot)} disabled={isAddDisabled}>
            {MAP_SEARCH_MESSAGE.ADD}
          </Button>
          {isAddDisabled && (
            <p className="text-xs text-red-600">
              {limitsError ? LIMIT_FETCH_ERROR_MESSAGE.description : MAP_SEARCH_MESSAGE.LIMIT_REACHED}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SelectedSpotCard;
