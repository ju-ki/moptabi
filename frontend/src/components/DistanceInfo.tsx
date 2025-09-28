import React, { useEffect, useState } from 'react';

import { Spot } from '@/types/plan';
import { calcDistance, calcTotalTransportTime } from '@/lib/algorithm';

import { transportIcons } from './TravelPlan';

interface SpotProps {
  spots: Spot[];
}

const DistanceInfo = ({ spots }: SpotProps) => {
  const MAX_HEIGHT_CLASS = 'max-h-[300px]';
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<string>('不明');

  useEffect(() => {
    if (spots.length) {
      setTotalDuration(calcTotalTransportTime(spots));
    }
  }, [spots]);

  const renderDetails = () => (
    <div
      className={`mt-3 pt-3 border-t border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? `opacity-100 ${MAX_HEIGHT_CLASS} overflow-y-auto` : 'opacity-0 max-h-0'
      }`}
    >
      <div className="flex flex-col space-y-3">
        {spots.map(
          (spot, idx) =>
            idx < spots.length - 1 && (
              <div key={idx} className="border-b last:border-b-0 pb-3">
                <div className="text-xs font-semibold text-indigo-600 mb-1">
                  移動 {idx + 1} / {spots.length - 1}
                </div>

                <div
                  className="text-sm font-medium text-gray-800 truncate max-w-full mb-2"
                  title={`${spot.location.name} → ${spots[idx + 1].location.name}`}
                >
                  <span className="text-gray-500 mr-1">📍</span>
                  {spot.location.name} <span className="mx-1 text-xs">→</span> {spots[idx + 1].location.name}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-xl flex-shrink-0" role="img" aria-label={spot.transports.name || '移動手段'}>
                    {transportIcons[spot.transports.name]?.icon || 'ℹ️'}
                  </div>
                  <div className="text-xl font-extrabold text-blue-700 leading-none flex-grow">
                    {spot.transports.travelTime}
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {calcDistance(spot.location, spots[idx + 1].location)}
                  </div>
                </div>
              </div>
            ),
        )}
      </div>
    </div>
  );
  return (
    <div className="bg-white p-3 rounded-xl shadow-2xl w-80 max-w-sm">
      <div
        className="flex justify-between items-center cursor-pointer overflow-hidden whitespace-nowrap"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-semibold">
            {isExpanded
              ? '全旅程の合計移動時間'
              : `次の移動: ${spots[0].location.name} → ${spots[1].location.name || '最終目的地'}`}
          </span>
          <span className="text-xl font-bold text-gray-900 mt-0.5">
            {isExpanded ? (
              totalDuration
            ) : (
              <span className="flex items-center gap-x-3">
                {transportIcons[spots[0].transports.name]?.icon || 'ℹ️'}
                {spots[0].transports.travelTime}
              </span>
            )}
          </span>
        </div>

        <button className="p-1 text-gray-600 hover:text-gray-900 transform transition-transform duration-300 ease-in-out">
          <svg
            className={`w-5 h-5 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>

      {renderDetails()}
    </div>
  );
};

export default DistanceInfo;
