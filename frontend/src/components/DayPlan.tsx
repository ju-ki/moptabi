'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsePlanType, Spot, TransportNodeType } from '@/types/plan';
import { useStoreForPlanning } from '@/lib/plan';

import { SpotCard } from './SpotCard2';
import TravelMap from './TravelMap';

interface DayPlanProps {
  plan: ResponsePlanType;
  dayNumber: number;
}

export function DayPlan({ plan, dayNumber }: DayPlanProps) {
  const fields = useStoreForPlanning();
  useEffect(() => {
    plan.planSpots.forEach((planSpot) => {
      const type = planSpot.spot.id.split('_')[0];

      const spot: Spot = {
        id: planSpot.spot.id,
        location: {
          latitude: planSpot.spot.meta.latitude,
          longitude: planSpot.spot.meta.longitude,
          name: planSpot.spot.meta.name,
        },
        stayStart: planSpot.stayStart,
        stayEnd: planSpot.stayEnd,
        order: planSpot.order,
        nearestStation: planSpot.spot.nearestStation,
        transports: {
          fromType: type === 'departure' ? TransportNodeType.DEPARTURE : TransportNodeType.SPOT,
          toType: type === 'destination' ? TransportNodeType.DESTINATION : TransportNodeType.SPOT,
          transportMethodIds: [0],
          name: 'WALKING',
          travelTime: '0',
        },
      };

      fields.setSpots(plan.date, spot, false);
    });
  }, [plan]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Day {dayNumber} - {format(plan.date, 'yyyy年MM月dd日')}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <MapPin className="w-4 h-4" />
          <span></span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {plan.planSpots.map((planSpot, index) => (
            <SpotCard
              key={planSpot.id}
              spot={planSpot.spot}
              spotInfo={planSpot}
              isLast={index === plan.planSpots.length - 1}
            />
          ))}

          <div>
            <TravelMap date={plan.date} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
