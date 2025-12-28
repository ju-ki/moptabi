'use client';

import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { APP_LIMITS } from '@/data/constants';

interface DateRangePickerProps {
  startDate: string | undefined;
  endDate: string | undefined;
  onDateChange: (date: { from: string | undefined; to: string | undefined } | undefined) => void;
  className?: string;
  maxDays?: number;
}

/**
 * 日付範囲選択コンポーネント
 * 旅行計画の開始日と終了日を選択するためのカレンダーポップオーバー
 */
export const DateRangePicker = ({
  startDate,
  endDate,
  onDateChange,
  className,
  maxDays = APP_LIMITS.MAX_PLAN_DAYS,
}: DateRangePickerProps) => {
  // 文字列の日付をDateオブジェクトに変換（無効な場合はundefinedを返す）
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return undefined;
    const parsed = new Date(year, month - 1, day);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const fromDate = parseDate(startDate);
  const toDate = parseDate(endDate);

  // カレンダーのデフォルト月を決定
  const defaultMonth = fromDate ?? new Date();

  // 選択可能な日付範囲を制限する関数
  const isDateDisabled = (date: Date): boolean => {
    if (!fromDate) return false;

    // 開始日より前の日付は選択不可
    if (date < fromDate) return true;

    // 開始日からmaxDays日後より後の日付は選択不可
    const maxDate = new Date(fromDate);
    maxDate.setDate(maxDate.getDate() + maxDays - 1);

    return date > maxDate;
  };

  // 日付が選択されたときのハンドラー
  const handleSelect = (dateRange: DateRange | undefined) => {
    if (!dateRange) {
      onDateChange(undefined);
      return;
    }

    // 日付をYYYY-MM-DD形式に変換（DBとの整合性のためISO形式を使用）
    const fromDateStr = dateRange.from ? dateRange.from.toLocaleDateString('sv-SE') : undefined;
    const toDateStr = dateRange.to ? dateRange.to.toLocaleDateString('sv-SE') : undefined;

    onDateChange({
      from: fromDateStr,
      to: toDateStr,
    });
  };

  // 表示用の日付テキストを生成
  const getDisplayText = (): React.ReactNode => {
    if (!fromDate) {
      return <span>日付範囲を選択</span>;
    }

    if (toDate) {
      return (
        <>
          {startDate} ~ {endDate}
        </>
      );
    }

    return startDate;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className={cn('w-full justify-start text-left font-normal', !fromDate && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={defaultMonth}
          selected={
            fromDate
              ? {
                  from: fromDate,
                  to: toDate,
                }
              : undefined
          }
          onSelect={handleSelect}
          disabled={isDateDisabled}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
