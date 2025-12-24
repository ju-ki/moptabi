'use client';

import { BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type UsageStatusProps = {
  planCount: number;
  planLimit: number;
  wishlistCount: number;
  wishlistLimit: number;
};

/**
 * 利用状況コンポーネント
 * プラン数と行きたいリスト数の現在値と上限を表示
 */
export function UsageStatus({ planCount, planLimit, wishlistCount, wishlistLimit }: UsageStatusProps) {
  const items = [
    {
      label: 'プラン',
      current: planCount,
      limit: planLimit,
    },
    {
      label: '行きたいリスト',
      current: wishlistCount,
      limit: wishlistLimit,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          利用状況
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const percentage = item.limit > 0 ? (item.current / item.limit) * 100 : 0;
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-medium">
                  {item.current} / {item.limit}件
                </span>
              </div>
              <Progress value={percentage} className="h-2" role="progressbar" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
