'use client';

import { Flag } from 'lucide-react';

import { DepartureAndDestinationType } from '@/models/planLocation';
import { convertHHmmToJpFormat } from '@/lib/utils';
import { TravelModeType } from '@/types/plan';

import { transportIcons } from './TravelPlan';
import { NearestStationDetail } from './NearestStationDetail';

interface DestinationInfoCardProps {
  destination: DepartureAndDestinationType;
  showTransportFromTop?: boolean;
}

export function DestinationInfoCard({ destination, showTransportFromTop = false }: DestinationInfoCardProps) {
  const transportIcon =
    transportIcons[destination.transports?.name as TravelModeType]?.icon ?? transportIcons.DEFAULT?.icon;
  const shouldShowTransportTime = Boolean(destination?.transports?.travelTime);

  return (
    <div className="relative flex gap-10 items-center">
      <div className="absolute left-8 top-0 bottom-1/2 w-0.5 bg-gray-300" aria-hidden="true"></div>
      <div className="flex flex-col items-center flex-shrink-0 relative w-16 z-10">
        <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md z-10">
          <Flag className="w-6 h-6" />
        </div>
        <span className="text-xs text-gray-600 mt-1 text-center">到着</span>

        {showTransportFromTop && shouldShowTransportTime && (
          <div className="absolute bottom-[calc(100%+30px)] left-1/2 -translate-x-1/2 translate-y-1/2 bg-white px-2 py-1 rounded text-xs text-gray-600 border border-gray-200 shadow-sm whitespace-nowrap z-20 flex items-center gap-1">
            <span data-testid="timeline-transport-icon">{transportIcon}</span>
            <span className="font-semibold">{convertHHmmToJpFormat(destination.transports?.travelTime ?? '')}</span>
          </div>
        )}
        {!showTransportFromTop && shouldShowTransportTime && (
          <div className="absolute top-[calc(100%+30px)] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs text-gray-600 border border-gray-200 shadow-sm whitespace-nowrap z-20 flex items-center gap-1">
            <span data-testid="timeline-transport-icon">{transportIcon}</span>
            <span className="font-semibold">{convertHHmmToJpFormat(destination.transports?.travelTime ?? '')}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 pt-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Flag className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{destination.name}</h3>
              {destination.time && <p className="text-sm text-gray-600">到着時刻: {destination.time}</p>}
            </div>
          </div>
          {destination.nearestStation && (
            <div className="text-sm text-gray-600" data-testid="destination-nearest-station">
              <NearestStationDetail
                nearestStation={destination.nearestStation}
                className="w-fit max-w-full rounded-md bg-gray-50 p-2"
                showDepartureTime={false}
                showTransitMemo={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
