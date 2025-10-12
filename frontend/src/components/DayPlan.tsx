'use client';

import { format } from 'date-fns';
import { MapPin } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsePlanType, TransportNodeType } from '@/types/plan';
import { useStoreForPlanning } from '@/lib/plan';

import { SpotInfoCard } from './SpotInfoCard';
import RouteSummary from './RouteSummary';
import SpotSummary from './SpotSummary';

interface DayPlanProps {
  plan: ResponsePlanType;
  dayNumber: number;
}

export function DayPlan({ plan, dayNumber }: DayPlanProps) {
  const fields = useStoreForPlanning();
  const allSpots = fields.getSpotInfo(plan.date, TransportNodeType.ALL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {dayNumber}日目 - {format(plan.date, 'yyyy年MM月dd日')}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2"></div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            タイムライン
          </h2>
          {allSpots.map((planSpot) => (
            <SpotInfoCard key={planSpot.id} spot={planSpot} />
          ))}
          <RouteSummary date={plan.date} />

          <SpotSummary date={plan.date} />
        </div>
      </CardContent>
    </Card>
  );
}
