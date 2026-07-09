'use client';

import React from 'react';
import { Clock } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';

interface TimelineStatusProps {
  date: string;
}

/**
 * プランニング後の出発時刻と到着時刻を表示するコンポーネント
 * 設計書: TimelineStatus
 */
export default function TimelineStatus({ date }: TimelineStatusProps) {
  const fields = useStoreForPlanning();
  const result = fields.getPlanningResult(date);
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);

  const plannedDepartureTime = departureData?.time ?? '';
  const plannedArrivalTime = destinationData?.time ?? '';
  const calculatedDepartureTime = result?.departureTime ?? '';
  const calculatedArrivalTime = result?.arrivalTime ?? '';
  const isOverTime = result?.isOverTime ?? false;

  if (!plannedDepartureTime && !plannedArrivalTime && !calculatedDepartureTime && !calculatedArrivalTime) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200" data-testid="timeline-status">
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white/60 p-3" data-testid="planned-departure-time">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">計算前の出発時刻</span>
            </div>
            <p className="text-lg font-semibold text-blue-900">{plannedDepartureTime || '---'}</p>
            <p className="text-xs text-muted-foreground">計算後の出発時刻</p>
            <p className="text-xs text-muted-foreground" data-testid="calculated-departure-time">
              {calculatedDepartureTime || '---'}
            </p>
          </div>

          <div className="rounded-lg bg-white/60 p-3" data-testid="planned-arrival-time">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-cyan-600" />
              <span className="text-xs text-muted-foreground">計算前の到着時刻</span>
            </div>
            <p className="text-lg font-semibold text-cyan-900">{plannedArrivalTime || '---'}</p>
            <p className="text-xs text-muted-foreground">計算後の到着時刻</p>
            <p className="text-xs font-medium" data-testid="calculated-arrival-time">
              <span
                className={isOverTime ? 'text-red-600' : 'text-muted-foreground'}
                data-testid="calculated-arrival-time-value"
              >
                {calculatedArrivalTime || '---'}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
