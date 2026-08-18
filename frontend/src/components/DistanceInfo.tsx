import React, { useEffect, useState } from 'react';

import { ExtendSpotType, TransportNodeType, TravelModeType } from '@/types/plan';
import { calcDistance, calcTotalTransportTime } from '@/lib/algorithm';
import { useStoreForPlanning } from '@/lib/plan';

import { transportIcons } from './TravelPlan';
import { convertHHmmToJpFormat } from '../lib/utils';

interface SpotProps {
  date: string;
  spots: ExtendSpotType[];
}

type SegmentNode = {
  name: string;
  lat: number;
  lng: number;
  nearestStation?: {
    name: string;
    walkingTime: number;
    transitTime?: number;
  };
};

type DistanceInfoRowsInput =
  | {
      kind: 'STATION';
      from: string;
      fromStation: string;
      toStation: string;
      to: string;
      walkToStationMinutes: number;
      stationTransitMinutes: number;
      walkFromStationMinutes: number;
    }
  | {
      kind: 'DIRECT';
      from: string;
      to: string;
      minutes: number;
    };

function buildDistanceInfoRows(input: DistanceInfoRowsInput): string[] {
  if (input.kind === 'STATION') {
    return [
      `${input.from} → ${input.fromStation}（徒歩${input.walkToStationMinutes}分）`,
      `${input.fromStation} → ${input.toStation}（${input.stationTransitMinutes}分）`,
      `${input.toStation} → ${input.to}（徒歩${input.walkFromStationMinutes}分）`,
    ];
  }
  return [`${input.from} → ${input.to}（${input.minutes}分）`];
}

const DistanceInfo = ({ date, spots }: SpotProps) => {
  const fields = useStoreForPlanning();
  const MAX_HEIGHT_CLASS = 'max-h-[300px]';
  const departure = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destination = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<string>('不明');

  useEffect(() => {
    if (spots.length && departure && destination) {
      setTotalDuration(calcTotalTransportTime(departure, destination, spots));
    }
  }, [spots, departure, destination]);

  const buildSegmentRows = (fromNode: SegmentNode, toNode: SegmentNode, fallbackMinutes?: number): string[] => {
    if (fromNode.nearestStation && toNode.nearestStation) {
      const stationTransitMinutes =
        fromNode.nearestStation.transitTime ?? toNode.nearestStation.transitTime ?? fallbackMinutes ?? 0;

      return buildDistanceInfoRows({
        kind: 'STATION',
        from: fromNode.name,
        fromStation: fromNode.nearestStation.name,
        toStation: toNode.nearestStation.name,
        to: toNode.name,
        walkToStationMinutes: fromNode.nearestStation.walkingTime,
        stationTransitMinutes,
        walkFromStationMinutes: toNode.nearestStation.walkingTime,
      });
    }

    return buildDistanceInfoRows({
      kind: 'DIRECT',
      from: fromNode.name,
      to: toNode.name,
      minutes: fallbackMinutes ?? 0,
    });
  };

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
            title={`${departure.name} → ${spots[0].name}`}
          >
            <span className="text-gray-500 mr-1">📍</span>
            {departure.name} <span className="mx-1 text-xs">→</span> {spots[0].name}
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-xl flex-shrink-0" role="img" aria-label={departure.transportMethod || '移動手段'}>
              {transportIcons[departure.transportMethod as TravelModeType]?.icon || 'ℹ️'}
            </div>
            <div className="text-xl font-extrabold text-blue-700 leading-none flex-grow">{departure.travelTime}</div>
            <div className="text-xs text-gray-500 flex-shrink-0">
              {calcDistance(
                {
                  id: departure.name,
                  lat: departure.latitude,
                  lng: departure.longitude,
                  name: departure.name,
                },
                {
                  id: spots[0].id,
                  lat: spots[0].latitude,
                  lng: spots[0].longitude,
                  name: spots[0].name,
                },
              )}
            </div>
          </div>
          <div className="mt-2 space-y-1" data-testid="distance-segment-rows">
            {buildSegmentRows(
              {
                name: departure.name,
                lat: departure.latitude,
                lng: departure.longitude,
                nearestStation: departure.nearestStation
                  ? {
                      name: departure.nearestStation.name ?? '最寄駅',
                      walkingTime: departure.nearestStation.walkingTime ?? 0,
                      transitTime: departure.nearestStation.transitTime,
                    }
                  : undefined,
              },
              {
                name: spots[0].name,
                lat: spots[0].latitude,
                lng: spots[0].longitude,
                nearestStation: spots[0].nearestStation
                  ? {
                      name: spots[0].nearestStation.name ?? '最寄駅',
                      walkingTime: spots[0].nearestStation.walkingTime ?? 0,
                      transitTime: spots[0].nearestStation.transitTime,
                    }
                  : undefined,
              },
              departure.travelTime,
            ).map((row) => (
              <p key={row} className="text-xs text-gray-600">
                {row}
              </p>
            ))}
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
                  title={`${spot.name} → ${spots[idx + 1].name}`}
                >
                  <span className="text-gray-500 mr-1">📍</span>
                  {spot.name} <span className="mx-1 text-xs">→</span> {spots[idx + 1].name}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-xl flex-shrink-0" role="img" aria-label={spot.transportMethod || '移動手段'}>
                    {transportIcons[spot.transportMethod as TravelModeType]?.icon || 'ℹ️'}
                  </div>
                  <div className="text-xl font-extrabold text-blue-700 leading-none flex-grow">{spot.travelTime}</div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {calcDistance(
                      {
                        id: spot.id,
                        name: spot.name,
                        lat: spot.latitude,
                        lng: spot.longitude,
                      },
                      {
                        id: spots[idx + 1].id,
                        name: spots[idx + 1].name,
                        lat: spots[idx + 1].latitude,
                        lng: spots[idx + 1].longitude,
                      },
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-1" data-testid="distance-segment-rows">
                  {buildSegmentRows(
                    {
                      name: spot.name,
                      lat: spot.latitude,
                      lng: spot.longitude,
                      nearestStation: spot.nearestStation
                        ? {
                            name: spot.nearestStation.name ?? '最寄駅',
                            walkingTime: spot.nearestStation.walkingTime ?? 0,
                            transitTime: spot.nearestStation.transitTime,
                          }
                        : undefined,
                    },
                    {
                      name: spots[idx + 1].name,
                      lat: spots[idx + 1].latitude,
                      lng: spots[idx + 1].longitude,
                      nearestStation: spots[idx + 1].nearestStation
                        ? {
                            name: spots[idx + 1].nearestStation?.name ?? '最寄駅',
                            walkingTime: spots[idx + 1].nearestStation?.walkingTime ?? 0,
                            transitTime: spots[idx + 1].nearestStation?.transitTime,
                          }
                        : undefined,
                    },
                    spot.travelTime,
                  ).map((row) => (
                    <p key={row} className="text-xs text-gray-600">
                      {row}
                    </p>
                  ))}
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
          title={`${spots[spots.length - 1].name} → ${destination.name}`}
        >
          <span className="text-gray-500 mr-1">📍</span>
          {spots[spots.length - 1].name} <span className="mx-1 text-xs">→</span> {destination.name}
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xl flex-shrink-0" role="img" aria-label={destination.transportMethod || '移動手段'}>
            {transportIcons[destination.transportMethod as TravelModeType]?.icon || 'ℹ️'}
          </div>
          <div className="text-xl font-extrabold text-blue-700 leading-none flex-grow">{destination.travelTime}</div>
          <div className="text-xs text-gray-500 flex-shrink-0">
            {calcDistance(
              {
                id: spots[spots.length - 1].name,
                name: spots[spots.length - 1].name,
                lat: spots[spots.length - 1].latitude,
                lng: spots[spots.length - 1].longitude,
              },
              {
                id: destination.name,
                lat: destination.latitude,
                lng: destination.longitude,
                name: destination.name,
              },
            )}
          </div>
        </div>
        <div className="mt-2 space-y-1" data-testid="distance-segment-rows">
          {buildSegmentRows(
            {
              name: spots[spots.length - 1].name,
              lat: spots[spots.length - 1].latitude,
              lng: spots[spots.length - 1].longitude,
              nearestStation: spots[spots.length - 1].nearestStation
                ? {
                    name: spots[spots.length - 1].nearestStation?.name ?? '最寄駅',
                    walkingTime: spots[spots.length - 1].nearestStation?.walkingTime ?? 0,
                    transitTime: spots[spots.length - 1].nearestStation?.transitTime,
                  }
                : undefined,
            },
            {
              name: destination.name,
              lat: destination.latitude,
              lng: destination.longitude,
              nearestStation: destination.nearestStation
                ? {
                    name: destination.nearestStation.name ?? '最寄駅',
                    walkingTime: destination.nearestStation.walkingTime ?? 0,
                    transitTime: destination.nearestStation.transitTime,
                  }
                : undefined,
            },
            destination.travelTime,
          ).map((row) => (
            <p key={row} className="text-xs text-gray-600">
              {row}
            </p>
          ))}
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
              : `次の移動: ${departure.name || '出発地'} → ${spots[0].name || '最終目的地'}`}
          </span>
          <span className="text-xl font-bold text-gray-900 mt-0.5">
            {isExpanded ? (
              convertHHmmToJpFormat(totalDuration)
            ) : (
              <span className="flex items-center gap-x-3">
                {transportIcons[departure.transportMethod as TravelModeType]?.icon || 'ℹ️'}
                {departure.travelTime}
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
