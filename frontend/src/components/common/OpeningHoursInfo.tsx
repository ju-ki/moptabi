import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { OPENING_HOURS_MESSAGE, OPENING_STATUS_BADGE_LABEL } from '@/data/constants';
import {
  checkOpeningStatus,
  getOpeningHoursOfDay,
  getWeekdayLabel,
  hasOpeningWarning,
  OpeningStatus,
} from '@/lib/opening-hours';
import { cn } from '@/lib/utils';
import { OpeningInfo, OpeningPeriod } from '@/types/spot';

type OpeningStatusBadgeProps = {
  status: OpeningStatus;
  className?: string;
};

/**
 * 営業時間の判定結果（No.158）のバッジ。営業中・情報なしのときは何も表示しない
 */
export function OpeningStatusBadge({ status, className }: OpeningStatusBadgeProps) {
  const label = OPENING_STATUS_BADGE_LABEL[status.kind];
  if (!label) return null;

  const isClosed = status.kind === 'CLOSED_PERMANENTLY' || status.kind === 'CLOSED_TEMPORARILY';
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 whitespace-nowrap',
        isClosed ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-400 bg-amber-50 text-amber-700',
        className,
      )}
      data-testid="opening-status-badge"
    >
      <AlertTriangle className="h-3 w-3" />
      {label}
    </Badge>
  );
}

type OpeningHoursOfDayProps = {
  openingPeriods?: OpeningPeriod[];
  date?: string;
  className?: string;
};

/**
 * 計画日の営業時間を 1 行で表示する（例: この日(火)の営業時間: 10:00-17:00）
 */
export function OpeningHoursOfDay({ openingPeriods, date, className }: OpeningHoursOfDayProps) {
  if (!date) return null;
  const hours = getOpeningHoursOfDay(openingPeriods, date);
  const weekdayLabel = getWeekdayLabel(date);
  if (!hours || !weekdayLabel) return null;

  return (
    <p
      className={cn('flex items-center gap-1 text-xs text-gray-600 text-left', className)}
      data-testid="opening-hours-of-day"
    >
      <Clock className="h-3 w-3 flex-shrink-0" />
      <span>
        この日({weekdayLabel})の営業時間: {hours}
      </span>
    </p>
  );
}

/**
 * 祝日の営業を判定していないことの注記
 */
export function HolidayNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground text-left', className)} data-testid="opening-hours-holiday-note">
      {OPENING_HOURS_MESSAGE.HOLIDAY_NOTE}
    </p>
  );
}

type SpotOpeningSummaryProps = {
  spot: OpeningInfo;
  planDate?: string;
  className?: string;
};

/**
 * 検索カード用: 計画日の判定バッジと営業時間の 1 行をまとめて表示する。表示するものがなければ何も描画しない
 */
export function SpotOpeningSummary({ spot, planDate, className }: SpotOpeningSummaryProps) {
  if (!planDate) return null;
  // 検索時点の滞在時間は仮置きなので、日単位で判定する（stayStart / stayEnd は渡さない）
  const status = checkOpeningStatus({
    openingPeriods: spot.openingPeriods,
    businessStatus: spot.businessStatus,
    date: planDate,
  });
  const hasBadge = !!OPENING_STATUS_BADGE_LABEL[status.kind];
  const hasHours = !!getOpeningHoursOfDay(spot.openingPeriods, planDate);
  if (!hasBadge && !hasHours) return null;

  return (
    <div className={cn('flex flex-col items-start gap-1', className)} data-testid="spot-opening-summary">
      <OpeningStatusBadge status={status} />
      <OpeningHoursOfDay openingPeriods={spot.openingPeriods} date={planDate} />
    </div>
  );
}

type OpeningHoursDetailProps = {
  status: OpeningStatus;
  openingPeriods?: OpeningPeriod[];
  date?: string;
  url?: string;
  className?: string;
};

/**
 * 計画作成・詳細のカード用: 計画日の営業時間の 1 行と、警告時の祝日注記・公式サイトリンクを表示する
 */
export function OpeningHoursDetail({ status, openingPeriods, date, url, className }: OpeningHoursDetailProps) {
  const isWarning = hasOpeningWarning(status);
  const hasHours = !!date && !!getOpeningHoursOfDay(openingPeriods, date);
  if (!isWarning && !hasHours) return null;

  return (
    <div className={cn('flex flex-col items-start gap-1', className)} data-testid="opening-hours-detail">
      <OpeningHoursOfDay openingPeriods={openingPeriods} date={date} />
      {isWarning && <HolidayNote />}
      {isWarning && url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          {OPENING_HOURS_MESSAGE.OFFICIAL_SITE_LINK}
        </a>
      )}
    </div>
  );
}
