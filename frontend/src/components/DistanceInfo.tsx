import React, { useEffect, useState } from 'react';

import { Spot, TransportNodeType, TravelModeType } from '@/types/plan';
import { calcDistance, calcTotalTransportTime } from '@/lib/algorithm';
import { useStoreForPlanning } from '@/lib/plan';

import { transportIcons } from './TravelPlan';
import { convertHHmmToJpFormat } from '../lib/utils';

interface SpotProps {
  date: string;
  spots: Spot[];
}

const DistanceInfo = ({ date, spots }: SpotProps) => {
  const fields = useStoreForPlanning();
  const MAX_HEIGHT_CLASS = 'max-h-[300px]';
  const departure = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destination = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<string>('不明');

  useEffect(() => {
    if (spots.length && departure) {
      setTotalDuration(calcTotalTransportTime(departure, spots));
    }
  }, [spots, departure]);

  const renderDetails = () => (
    <div
      className={`mt-3 pt-3 border-t border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? `opacity-100 ${MAX_HEIGHT_CLASS} overflow-y-auto` : 'opacity-0 max-h-0'
      }`}
    >
      <div className="flex flex-col space-y-3">
        {/* 出発地から最初の観光地への移動情報 */}
        <div className="border-b last:border-b-0 pb-3">
          <div className="text-xs font-semibold text-indigo-600 mb-1">移動 1 / {spots.length + 1}</div>
          <div
            className="text-sm font-medium text-gray-800 truncate max-w-full mb-2"
            title={`${departure.name} → ${spots[0].location.name}`}
          >
            <span className="text-gray-500 mr-1">📍</span>
            {departure.name} <span className="mx-1 text-xs">→</span> {spots[0].location.name}
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-xl flex-shrink-0" role="img" aria-label={departure?.transports?.name || '移動手段'}>
              {transportIcons[departure?.transports?.name as TravelModeType]?.icon || 'ℹ️'}
            </div>
            <div className="text-xl font-extrabold text-blue-700 leading-none flex-grow">
              {departure &&
                departure.transports &&
                departure.transports.travelTime &&
                convertHHmmToJpFormat(departure.transports.travelTime)}
            </div>
            <div className="text-xs text-gray-500 flex-shrink-0">
              {calcDistance(
                {
                  id: departure.name,
                  lat: departure.latitude,
                  lng: departure.longitude,
                  name: departure.name,
                },
                spots[0].location,
              )}
            </div>
          </div>
        </div>
        {spots.map(
          (spot, idx) =>
            idx < spots.length - 1 && (
              <div key={idx} className="border-b last:border-b-0 pb-3">
                <div className="text-xs font-semibold text-indigo-600 mb-1">
                  移動 {idx + 2} / {spots.length + 1}
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
                    {spot &&
                      spot.transports &&
                      spot.transports.travelTime &&
                      convertHHmmToJpFormat(spot.transports.travelTime)}
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {calcDistance(spot.location, spots[idx + 1].location)}
                  </div>
                </div>
              </div>
            ),
        )}
        {/* 最後のスポットから目的地への移動情報 */}
        <div>
          <div className="text-xs font-semibold text-indigo-600 mb-1">
            移動 {spots.length + 1} / {spots.length + 1}
          </div>
        </div>
        <div
          className="text-sm font-medium text-gray-800 truncate max-w-full mb-2"
          title={`${spots[spots.length - 1].location.name} → ${destination.name}`}
        >
          <span className="text-gray-500 mr-1">📍</span>
          {spots[spots.length - 1].location.name} <span className="mx-1 text-xs">→</span> {destination.name}
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xl flex-shrink-0" role="img" aria-label={destination?.transports?.name || '移動手段'}>
            {transportIcons[destination?.transports?.name as TravelModeType]?.icon || 'ℹ️'}
          </div>
          <div className="text-xl font-extrabold text-blue-700 leading-none flex-grow">
            {destination &&
              destination.transports &&
              destination.transports.travelTime &&
              convertHHmmToJpFormat(destination?.transports?.travelTime)}
          </div>
          <div className="text-xs text-gray-500 flex-shrink-0">
            {calcDistance(spots[spots.length - 1].location, {
              id: destination.name,
              lat: destination.latitude,
              lng: destination.longitude,
              name: destination.name,
            })}
          </div>
        </div>
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
              : `次の移動: ${departure.name || '出発地'} → ${spots[0].location.name || '最終目的地'}`}
          </span>
          <span className="text-xl font-bold text-gray-900 mt-0.5">
            {isExpanded ? (
              convertHHmmToJpFormat(totalDuration)
            ) : (
              <span className="flex items-center gap-x-3">
                {transportIcons[departure?.transports?.name as TravelModeType]?.icon || 'ℹ️'}
                {departure.transports &&
                  departure.transports.travelTime &&
                  convertHHmmToJpFormat(departure?.transports?.travelTime)}
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
