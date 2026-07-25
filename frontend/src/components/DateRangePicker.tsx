'use client';

import { CalendarIcon, Info } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { ja } from 'date-fns/locale';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, getDatesBetween } from '@/lib/utils';
import { APP_LIMITS } from '@/data/constants';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './ui/dialog';

interface DateRangePickerProps {
  startDate: string | undefined;
  endDate: string | undefined;
  onDateChange: (date: { from: string | undefined; to: string | undefined } | undefined) => void;
  onDeletePlanData: (deletedDates: string[]) => void;
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
  onDeletePlanData,
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

  /**
   *  選択した日付によって、計画したプラン日が消えているかの判定
   *  @params dateRange - 入力された日付範囲
   *  @return string[] 範囲外の日付のリスト
   */
  const getOutSideDate = (newRange: DateRange) => {
    const outSideDates: string[] = [];
    if (!fromDate || !toDate || !newRange.from || !newRange.to) {
      // 完全にクリアされる場合は、既存の全日程が削除対象
      if (fromDate && toDate && (!newRange.from || !newRange.to)) {
        return getDatesBetween(fromDate, toDate);
      }
      return outSideDates;
    }

    const currentDates = getDatesBetween(fromDate, toDate);
    const newDates = getDatesBetween(newRange.from, newRange.to);

    // 文字列（YYYY-MM-DD）で正しく存在チェックを行う
    return currentDates.filter((dateStr) => !newDates.includes(dateStr));
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
    let nextRange: DateRange = dateRange ?? { from: undefined, to: undefined };

    // 1. リセット処理: 既に「開始＝終了」かつ同じ日を再度クリック
    if (fromDate && toDate && fromDate.getTime() === toDate.getTime() && selectedDay.getTime() === fromDate.getTime()) {
      nextRange = { from: undefined, to: undefined };
    }
    // 2. 日帰り処理: 開始日のみがある状態で同じ日をクリック
    else if (fromDate && !toDate && selectedDay.getTime() === fromDate.getTime()) {
      nextRange = { from: selectedDay, to: selectedDay };
    }
    // 3. 選択後に日数が減り、単数日になる場合は日帰り扱いにする(前倒し)
    else if (fromDate && toDate && selectedDay.getTime() === fromDate.getTime()) {
      // 日数が減り、単数日になる場合は日帰り扱い
      nextRange = { from: selectedDay, to: selectedDay };
    }
    // 4. 選択後に日数が減り、単数日になる場合は日帰り扱いにする(後ろ倒し)
    else if (fromDate && toDate && selectedDay.getTime() === toDate.getTime()) {
      // 日数が減り、単数日になる場合は日帰り扱い
      nextRange = { from: selectedDay, to: selectedDay };
    }

    // 削除判定
    const outSideDates = getOutSideDate(nextRange);
    if (outSideDates.length > 0) {
      setPendingRange(nextRange);
      setPendingDeletedDates(outSideDates);
      setShowConfirm(true);
      return;
    }

    // 親への通知
    triggerDateChange(nextRange);
  };

  const triggerDateChange = (range: DateRange) => {
    onDateChange({
      from: range.from ? range.from.toLocaleDateString('sv-SE') : undefined,
      to: range.to ? range.to.toLocaleDateString('sv-SE') : undefined,
    });
  };

  // ユーザー向けメッセージ
  const getHintMessage = () => {
    if (!fromDate) return `開始日を選んでください（最大 ${maxDays} 日間）`;
    if (fromDate && !toDate) return '終了日を選ぶか、同じ日を選んで「日帰り」にしてください';
    return '日付を減らすには、開始または終了日を選択してください';
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

    // 削除対象のプランデータも削除する
    onDeletePlanData(pendingDeletedDates);

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
        <div className="border-b bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            <span>日付選択のヒント</span>
          </div>
          <div className="text-xs text-muted-foreground">{getHintMessage()}</div>
        </div>
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
          numberOfMonths={1}
          max={maxDays}
        />
        {showConfirm && (
          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent className="overflow-y-auto">
              <DialogTitle>日付変更の確認</DialogTitle>
              <DialogDescription>選択した日付により既存の計画日が削除されます。削除しますか？</DialogDescription>
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <div className="mb-2 text-sm font-medium text-red-700">削除対象の日付</div>
                <ul className="max-h-32 space-y-1 overflow-y-auto pr-1 text-sm text-red-600">
                  {pendingDeletedDates.map((date) => (
                    <li key={date}>{date}</li>
                  ))}
                </ul>
              </div>
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
