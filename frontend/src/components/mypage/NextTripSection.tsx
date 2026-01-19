'use client';

import Link from 'next/link';
import { Calendar, MapPin, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type NextTrip = {
  id: number;
  title: string;
  startDate: string;
  daysUntil: number;
};

type NextTripSectionProps = {
  nextTrip: NextTrip | null;
  wishlistCount: number;
};

/**
 * 次の旅セクションコンポーネント
 * 未来のプランがある場合はその情報を、ない場合はプラン作成を促すメッセージを表示
 */
export function NextTripSection({ nextTrip, wishlistCount }: NextTripSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          {nextTrip ? '次の旅' : '旅を計画しよう'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {nextTrip ? (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900">{nextTrip.title}</h3>
              <p className="text-sm text-gray-500">{nextTrip.startDate}</p>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">あと{nextTrip.daysUntil}日</span>
            </div>
            <Link href={`/plan/${nextTrip.id}`}>
              <Button variant="outline" className="w-full">
                詳細を見る
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 text-center py-2">
            <p className="text-gray-600">次の旅を計画しませんか？</p>
            {wishlistCount > 0 && (
              <p className="text-sm text-gray-500 flex items-center justify-center">
                <MapPin className="h-4 w-4 mr-2" />
                行きたいリストに{wishlistCount}件のスポットがあります
              </p>
            )}
            <Link href="/plan/create">
              <Button className="w-full">プランを作成する</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
