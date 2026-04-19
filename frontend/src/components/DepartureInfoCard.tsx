'use client';

import { Home } from 'lucide-react';

import { convertHHmmToJpFormat } from '@/lib/utils';
import { DepartureAndDestinationType } from '@/models/planLocation';

interface DepartureAndDestinationCardProps {
  departure: DepartureAndDestinationType;
}

export function DepartureInfoCard({ departure }: DepartureAndDestinationCardProps) {
  return (
    <div className="relative flex gap-10 mb-4 items-center">
      <div className="flex flex-col items-center flex-shrink-0 relative">
        <div className="w-16 h-16 rounded-full bg-gray-500 text-white flex items-center justify-center shadow-md z-10">
          <Home className="w-6 h-6" />
        </div>
        <span className="text-xs text-gray-600 mt-1 text-center">出発</span>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-[150%] bg-gray-300 z-0"></div>

        <div className="absolute top-[calc(100%+30px)] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs text-gray-600 border border-gray-200 shadow-sm whitespace-nowrap z-20 flex items-center gap-1">
          🚗
          <span className="font-semibold">
            {departure &&
              departure.transports &&
              departure.transports.travelTime &&
              convertHHmmToJpFormat(departure.transports.travelTime)}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-2 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Home className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{departure.name}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
