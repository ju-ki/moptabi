import React from 'react';
import { Flag, Home } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';

interface SpotSummaryProps {
  date: string;
}

const SpotSummary = ({ date }: SpotSummaryProps) => {
  const fields = useStoreForPlanning();
  const departureSpot = fields.getSpotInfo(date, TransportNodeType.DEPARTURE);
  const destinationSpot = fields.getSpotInfo(date, TransportNodeType.DESTINATION);
  const sightseeingSpots = fields.getSpotInfo(date, TransportNodeType.SPOT);

  if (!departureSpot.length || !destinationSpot.length || !sightseeingSpots.length) {
    return <>Loading</>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm  p-2">
      <p className="text-xs font-semibold text-gray-700 mb-3">訪問順</p>
      <div className="space-y-2">
        {/* 出発地 */}
        <button className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{departureSpot[0].location.name}</span>
          </div>
        </button>

        {/* 観光スポット */}
        {sightseeingSpots.map((data, index) => (
          <button
            key={index}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">{data.location.name}</span>
            </div>
          </button>
        ))}

        {/* 目的地 */}
        <button className="w-full text-left px-3 py-2 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{destinationSpot[0].location.name}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SpotSummary;
