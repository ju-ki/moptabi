'use client';

import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { PlanType } from '@shared/plan/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransportNodeType } from '@/types/plan';
import { useStoreForPlanning } from '@/lib/plan';

import { SpotInfoCard } from './SpotInfoCard';
import RouteSummary from './RouteSummary';
import SpotSummary from './SpotSummary';
import { DepartureInfoCard } from './DepartureInfoCard';
import { DestinationInfoCard } from './DestinationInfoCard';

interface DayPlanProps {
  plan: PlanType;
  dayNumber: number;
}

export function DayPlan({ plan, dayNumber }: DayPlanProps) {
  const fields = useStoreForPlanning();
  const allSpots = fields.getSpotInfo(plan.date, TransportNodeType.SPOT);
  const departureData = fields.getDepartureAndDestination(plan.date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(plan.date, TransportNodeType.DESTINATION);

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
          {departureData && <DepartureInfoCard departure={departureData} />}
          {allSpots.map((planSpot, index) => {
            const nextSpot = allSpots[index + 1];
            const nextNearestStation = nextSpot?.nearestStation ?? destinationData?.nearestStation;
            return <SpotInfoCard key={planSpot.id} spot={planSpot} nextNearestStation={nextNearestStation} />;
          })}
          {destinationData && <DestinationInfoCard destination={destinationData} />}
          <RouteSummary date={plan.date} />

          <SpotSummary date={plan.date} />

          {/* プランごとのメモ表示 */}
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <h3 className="text-lg font-semibold mb-2">メモ</h3>
            <p className="text-gray-700">{plan.memo || 'ここにメモが表示されます'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
