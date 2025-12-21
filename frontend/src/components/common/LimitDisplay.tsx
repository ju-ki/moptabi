import React from 'react';

import { cn } from '@/lib/utils';

export interface LimitDisplayProps {
  /** 現在の件数 */
  current: number;
  /** 上限 */
  limit: number;
  /** ラベル */
  label: string;
  /** 単位（デフォルト: 件） */
  unit?: string;
  /** サイズ */
  size?: 'sm' | 'md' | 'lg';
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 上限と現在の件数を表示するコンポーネント
 * 上限に近づくと警告色、上限に達すると赤色で表示
 */
export function LimitDisplay({ current, limit, label, unit = '件', size = 'md', className }: LimitDisplayProps) {
  // 上限に対する割合を計算
  const ratio = current / limit;

  // スタイルを決定
  const getColorClass = () => {
    if (ratio >= 1) {
      return 'text-red-600'; // 上限に達している
    } else if (ratio >= 0.8) {
      return 'text-yellow-600'; // 80%以上で警告
    } else {
      return 'text-gray-600'; // 通常
    }
  };

  // サイズクラスを決定
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'md':
      default:
        return 'text-sm';
    }
  };

  return (
    <span
      data-testid="limit-display"
      className={cn('flex items-center gap-1 font-medium', getColorClass(), getSizeClass(), className)}
    >
      <span>作成可能数 : </span>
      <span>{label}</span>
      <span className="font-bold">{current}</span>
      <span>
        / {limit}
        {unit}
      </span>
    </span>
  );
}
