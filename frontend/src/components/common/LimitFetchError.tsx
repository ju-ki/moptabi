import React from 'react';
import { AlertCircle } from 'lucide-react';

import { LIMIT_FETCH_ERROR_MESSAGE } from '@/lib/limits';
import { cn } from '@/lib/utils';

import { Button } from '../ui/button';

export interface LimitFetchErrorProps {
  /** 再試行ボタン押下時の処理 */
  onRetry: () => void;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 上限の取得に失敗したことを表示し、再取得を促すコンポーネント
 */
export function LimitFetchError({ onRetry, className }: LimitFetchErrorProps) {
  return (
    <span data-testid="limit-fetch-error" className={cn('flex items-center gap-2 text-xs text-red-600', className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{LIMIT_FETCH_ERROR_MESSAGE.title}</span>
      <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={onRetry}>
        再試行
      </Button>
    </span>
  );
}
