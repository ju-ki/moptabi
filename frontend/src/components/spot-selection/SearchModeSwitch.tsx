'use client';

import { List, Map } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SpotSearchMode, useSpotSearchStore } from '@/store/planning/spotSearchStore';

const MODES: { value: SpotSearchMode; label: string; Icon: typeof List }[] = [
  { value: 'list', label: 'リストで探す', Icon: List },
  { value: 'map', label: '地図で探す', Icon: Map },
];

/**
 * 「リストで探す / 地図で探す」の切替（No.341）
 * 選んだ探し方はストアに残し、次にダイアログを開いたときも同じ探し方にする
 */
export function SearchModeSwitch() {
  const { searchMode, setSearchMode } = useSpotSearchStore();

  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {MODES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={searchMode === value}
          onClick={() => setSearchMode(value)}
          className={cn(
            'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            searchMode === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/60',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
