'use client';

import { Flag } from 'lucide-react';

import { DepartureAndDestinationType } from '@/models/planLocation';

interface DestinationInfoCardProps {
  destination: DepartureAndDestinationType;
}

export function DestinationInfoCard({ destination }: DestinationInfoCardProps) {
  return (
    <div className="relative flex gap-10 mt-4 items-center">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md z-10">
          <Flag className="w-6 h-6" />
        </div>
        <span className="text-xs text-gray-600 mt-1 text-center">到着</span>
      </div>

      <div className="flex-1 min-w-0 pt-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Flag className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{destination.name}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
