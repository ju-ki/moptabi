'use client';

import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Trip = {
  id: number;
  title: string;
  startDate: string;
};

type RecentTripsProps = {
  trips: Trip[];
};

/**
 * 最近の旅コンポーネント
 * 過去のプランを最大3件表示
 */
export function RecentTrips({ trips }: RecentTripsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          最近の旅
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trips.length > 0 ? (
          <div className="space-y-3">
            <ul className="space-y-2">
              {trips.map((trip) => (
                <li key={trip.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium text-gray-900">{trip.title}</span>
                  <span className="text-sm text-gray-500">{trip.startDate}</span>
                </li>
              ))}
            </ul>
            <Link href="/plan/list" className="flex items-center justify-end text-sm text-blue-600 hover:text-blue-800">
              すべて見る
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">まだ旅の記録がありません</p>
        )}
      </CardContent>
    </Card>
  );
}
