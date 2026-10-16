'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { OPENING_HOURS_MESSAGE } from '@/data/constants';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';

/**
 * 「計画日に営業しているスポットのみ」フィルター（No.158）
 * Google 検索・行きたいリスト・過去のスポットの 3 タブで状態を共有する
 */
export function OpenOnPlanDateFilter() {
  const { openOnPlanDate, setOpenOnPlanDate } = useSpotSearchStore();

  return (
    <label
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors w-fit ${
        openOnPlanDate ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
      }`}
    >
      <Checkbox
        checked={openOnPlanDate}
        onCheckedChange={() => setOpenOnPlanDate(!openOnPlanDate)}
        aria-label={OPENING_HOURS_MESSAGE.FILTER_LABEL}
        className="data-[state=checked]:bg-primary"
      />
      <span className="text-sm font-medium whitespace-nowrap">{OPENING_HOURS_MESSAGE.FILTER_LABEL}</span>
    </label>
  );
}
