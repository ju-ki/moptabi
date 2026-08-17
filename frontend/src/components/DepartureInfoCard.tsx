'use client';

import { Home } from 'lucide-react';


import { TravelModeType } from '@/types/plan';

import { NearestStationDetail } from './NearestStationDetail';
import { transportIcons } from './TravelPlan';

import type { PlanLocationType } from '@shared/planlocation/types';

interface DepartureAndDestinationCardProps {
  departure: PlanLocationType;
}

export function DepartureInfoCard({ departure }: DepartureAndDestinationCardProps) {
  const transportIcon =
    transportIcons[departure.transportMethod as TravelModeType]?.icon ?? transportIcons.DEFAULT?.icon;

  return (
    <div className="relative flex gap-10 items-center pb-6">
      <div className="absolute left-8 top-1/2 bottom-0 w-0.5 bg-gray-300" aria-hidden="true"></div>
      <div className="flex flex-col items-center flex-shrink-0 relative w-16 z-10">
        <div className="w-16 h-16 rounded-full bg-gray-500 text-white flex items-center justify-center shadow-md z-10">
          <Home className="w-6 h-6" />
        </div>
        <span className="text-xs text-gray-600 mt-1 text-center">出発</span>

        <div className="absolute top-[calc(100%+30px)] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs text-gray-600 border border-gray-200 shadow-sm whitespace-nowrap z-20 flex items-center gap-1">
          <span data-testid="timeline-transport-icon">{transportIcon}</span>
          <span className="font-semibold">{departure.travelTime}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-2 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Home className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{departure.name}</h3>
              {departure.time && <p className="text-sm text-gray-600">出発時刻: {departure.time}</p>}
            </div>
          </div>
          {departure.nearestStation && (
            <div className="text-sm text-gray-600" data-testid="departure-nearest-station">
              <NearestStationDetail
                nearestStation={departure.nearestStation}
                className="w-fit max-w-full rounded-md bg-gray-50 p-2"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
