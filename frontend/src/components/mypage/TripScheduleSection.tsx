'use client';

import Link from 'next/link';
import { Calendar, MapPin, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TripCalendar } from '@/components/mypage/TripCalendar';
import type { NextTrip, TripSummary } from '@/models/mypage';

type TripScheduleSectionProps = {
  nextTrips: NextTrip[];
  wishlistCount: number;
  trips: TripSummary[];
  defaultCalendarDate: Date;
};

export function TripScheduleSection({
  nextTrips,
  wishlistCount,
  trips,
  defaultCalendarDate,
}: TripScheduleSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          {nextTrips.length > 0 ? '次の旅' : '旅を計画しよう'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextTrips.length > 0 ? (
          <div className="space-y-3">
            {nextTrips.map((trip) => (
              <div key={trip.id} className="space-y-1 border-b last:border-0 pb-3 last:pb-0">
                <div>
                  <h3 className="font-semibold text-gray-900">{trip.title}</h3>
                  <p className="text-sm text-gray-500">{trip.startDate}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">あと{trip.daysUntil}日</span>
                  </div>
                  <Link href={`/plan/${trip.id}`}>
                    <Button variant="outline" size="sm">
                      詳細を見る
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
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

        <TripCalendar trips={trips} defaultDate={defaultCalendarDate} />
      </CardContent>
    </Card>
  );
}
