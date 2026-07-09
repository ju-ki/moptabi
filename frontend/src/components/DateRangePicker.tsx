'use client';

import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { ja } from 'date-fns/locale';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, getDatesBetween } from '@/lib/utils';
import { APP_LIMITS } from '@/data/constants';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from './ui/dialog';

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
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);
  const [pendingDeletedDates, setPendingDeletedDates] = useState<string[]>([]);
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

  /**
   *  選択した日付によって、計画したプラン日が消えているかの判定
   *  @params dateRange - 入力された日付範囲
   *  @return string[] 範囲外の日付のリスト
   */
  const getOutSideDate = (dateRange: DateRange) => {
    const outSideDates: string[] = [];
    if (fromDate && toDate) {
      // ストアに保存されている日付と入力された日付を比較して、ストアに保存されている日付が範囲外になる日付を抽出
      const currentDates = getDatesBetween(fromDate, toDate).map((date) => date);
      const newDates = getDatesBetween(dateRange.from!, dateRange.to!).map((date) => date);

      currentDates.forEach((date) => {
        if (!newDates.some((newDate) => newDate === date)) {
          outSideDates.push(date);
        }
      });
    }
    return outSideDates;
  };

  /**
   * 日付選択時の処理
   * - 同じ日付を選択した場合はリセット扱いとする
   * - 開始日があって同じ日付を選択した場合は日帰り扱いとする
   * - 日数が減って既存のプラン日が消える場合は確認ダイアログを表示する
   * - 通常の選択処理では日付をYYYY-MM-DD形式に変換して onDateChange を呼び出す
   * @param dateRange - カレンダーから選択された日付範囲
   * @param selectedDay - カレンダーから選択された日付（単日選択の際に使用）
   * @returns
   */
  const handleSelect = (dateRange: DateRange | undefined, selectedDay: Date) => {
    // 開始日と終了日があって、同じ日付をクリックした場合はリセット扱いとする
    if (fromDate && toDate && selectedDay.getTime() === fromDate.getTime() && fromDate.getTime() == toDate.getTime()) {
      dateRange = { from: undefined, to: undefined };
      //削除対象の日付を抽出する
      const outSideDates = getOutSideDate(dateRange);
      if (outSideDates.length > 0) {
        setPendingRange(dateRange);
        setPendingDeletedDates(outSideDates);
        setShowConfirm(true);
        return;
      }
    }
    // 開始日があって、同じ日付をクリックした場合は日帰り扱いとする
    if (fromDate && selectedDay.getTime() === fromDate.getTime()) {
      dateRange = { from: selectedDay, to: selectedDay };
    }

    if (!dateRange || !dateRange.from) return;

    // 2回目のクリック（異なる終了日が選ばれた場合）
    if (dateRange.to) {
      const outSideDates = getOutSideDate(dateRange);

      // 日数が減って既存のプラン日が消える場合は確認ダイアログを表示
      if (outSideDates.length > 0) {
        setPendingRange(dateRange);
        setPendingDeletedDates(outSideDates);
        setShowConfirm(true);
        return;
      }
    }

    // 通常の選択処理（日付をYYYY-MM-DD形式に変換）
    const fromDateStr = dateRange.from ? dateRange.from.toLocaleDateString('sv-SE') : undefined;
    const toDateStr = dateRange.to ? dateRange.to.toLocaleDateString('sv-SE') : undefined;

    onDateChange({
      from: fromDateStr,
      to: toDateStr,
    });
  };

  /**
   * 削除ボタン押下維持の処理
   * 保留中の日付範囲を確定して onDateChange を呼び出す
   */
  const handleConfirmDelete = () => {
    if (!pendingRange) return;

    const fromDateStr = pendingRange.from ? pendingRange.from.toLocaleDateString('sv-SE') : undefined;
    const toDateStr = pendingRange.to ? pendingRange.to.toLocaleDateString('sv-SE') : undefined;

    onDateChange({ from: fromDateStr, to: toDateStr });

    setShowConfirm(false);
    setPendingRange(undefined);
    setPendingDeletedDates([]);
  };

  /**
   * キャンセルボタン押下時の処理
   * モーダルを閉じて,削除対象日のリストと保留中の日付範囲をリセットする
   */
  const handleCancelDelete = () => {
    setShowConfirm(false);
    setPendingRange(undefined);
    setPendingDeletedDates([]);
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
          locale={ja}
          initialFocus
          mode="range"
          defaultMonth={defaultMonth}
          selected={{
            from: fromDate,
            to: toDate,
          }}
          onSelect={(dateRange, selectedDay) => handleSelect(dateRange, selectedDay)}
          disabled={isDateDisabled}
          numberOfMonths={2}
        />
        {showConfirm && (
          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent>
              <DialogTitle>日付変更の確認</DialogTitle>
              <DialogDescription>
                選択した日付により既存の計画日が削除されます。削除しますか？
                <p className="mt-2 list-disc list-inside text-sm text-red-600">
                  {pendingDeletedDates.map((date) => (
                    <p key={date}>{date}</p>
                  ))}
                </p>
              </DialogDescription>
              <DialogFooter>
                <Button onClick={handleConfirmDelete} variant="destructive" role="button">
                  削除
                </Button>
                <Button onClick={handleCancelDelete} variant="outline" role="button">
                  キャンセル
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
