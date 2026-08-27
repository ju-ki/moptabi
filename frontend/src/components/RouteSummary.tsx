import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

import { calcTotalTransportTime, calcTotalDistance } from '@/lib/algorithm';
import { formatDistanceAsKilometer, formatDurationAsHourMinute } from '@/lib/planning';
import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';

import TravelMap from './TravelMap';

interface RouteSummaryProps {
  date: string;
}

const RouteSummary = ({ date }: RouteSummaryProps) => {
  const fields = useStoreForPlanning();
  const allSpots = fields.getSpotInfo(date, TransportNodeType.SPOT);
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const sightseeingSpots = fields.getSpotInfo(date, TransportNodeType.SPOT);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);

  useEffect(() => {
    if (allSpots.length) {
      setTotalDuration(calcTotalTransportTime(departureData, allSpots));
      setTotalDistance(
        calcTotalDistance(
          departureData,
          fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION),
          allSpots,
        ),
      );
    }
  }, [allSpots, date]);
  return (
    <div className="bg-white rounded-lg shadow-sm  p-2 top-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-500" />
        ルートマップ
      </h2>

      {/* 地図表示 */}
      <div className="mb-4">
        <TravelMap date={date} />
      </div>

      {/* ルートサマリー */}
      <div className="space-y-2 mb-4 pb-4 border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">総距離</span>
          <span className="font-semibold">{formatDistanceAsKilometer(totalDistance)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">総移動時間</span>
          <span className="font-semibold">{formatDurationAsHourMinute(totalDuration)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">訪問スポット</span>
          <span className="font-semibold">{sightseeingSpots.length}箇所</span>
        </div>
      </div>
    </div>
  );
};

export default RouteSummary;
