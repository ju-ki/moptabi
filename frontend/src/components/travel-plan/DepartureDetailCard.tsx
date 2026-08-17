'use client';

import { useMemo, useState } from 'react';
import { MapPin, Train, FootprintsIcon, Car, Bike, CircleHelp, Clock } from 'lucide-react';

import RouteSummaryNearestStation from '@/components/travel-plan/nearestStation/RouteSummaryNearestStation';
import { TransportNodeType, TravelModeType } from '@/types/plan';
import { DEFAULT_DEPARTURE_TIME, SpotMakerColors } from '@/data/constants';
import { useStoreForPlanning } from '@/lib/plan';
import { TransportMethodType } from '@shared/transports/types';

/**
 * 移動手段のアイコンと表示名のマッピング
 */
const transportIcons: Record<TransportMethodType | 'DEFAULT', { icon: JSX.Element; label: string }> = {
  WALKING: { icon: <FootprintsIcon className="w-5 h-5 text-yellow-500" />, label: '徒歩' },
  TRANSIT: { icon: <Train className="w-5 h-5 text-blue-500" />, label: '最寄駅/バス停経由' },
  DRIVING: { icon: <Car className="w-5 h-5 text-gray-700" />, label: '車' },
  BICYCLING: { icon: <Bike className="w-5 h-5 text-green-500" />, label: '自転車' },
  DEFAULT: { icon: <CircleHelp className="w-5 h-5 text-gray-400" />, label: '不明' },
};

/**
 * DepartureDetailCardコンポーネントのプロパティ
 */
interface DepartureDetailCardProps {
  date: string;
  /** 表示インデックス（0始まり） */
  index: number;
  /** 発車時間候補 */
  departureTimeCandidates?: string[];
  /** 発車時間切替 */
  onDepartureTimeChange?: (time: string) => void;
}

/**
 * DepartureDetailCardコンポーネント
 *
 * 旅行計画プレビュー画面で出発地点の詳細情報を表示します。
 *
 * 表示内容（画面設計書より）:
 * - 出発地点の名称
 * - 出発地点の住所
 * - 出発地点の間の移動時間と交通手段表示
 */
export default function DepartureDetailCard({
  date,
  index,
  departureTimeCandidates = [],
  onDepartureTimeChange,
}: DepartureDetailCardProps) {
  const fields = useStoreForPlanning();
  // ストアから最新の出発地情報を取得（代替ルート切り替え時に更新された値を反映するため）
  const departure = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);

  const nextSpot = fields.getSpotInfo(date, null)[0];
  const transportCandidates =
    departure?.alternativeTransports?.map((transport) => ({
      name: transport.transportMethod as TravelModeType,
      travelTime: transport.durationText,
      transportMethod: transport.transportMethod as TransportMethodType,
      transportMethodId: transport.transportMethodId,
      isDisabled: false, //TODO: 仮
    })) ?? [];
  const planningResult = fields.getPlanningResult(date);
  const routeInfo = planningResult?.routes?.find((r) => r.fromType === 'DEPARTURE' && r.toType === 'SPOT');

  const [activeDepartureTime, setActiveDepartureTime] = useState<string>(
    planningResult?.updatedDeparture.nearestStation?.scheduledDepartureTime ?? DEFAULT_DEPARTURE_TIME,
  );

  const selectableDepartureCandidates = useMemo(
    () => departureTimeCandidates.filter((time) => time !== activeDepartureTime),
    [departureTimeCandidates, activeDepartureTime],
  );

  const handleDepartureTimeChange = (time: string) => {
    setActiveDepartureTime(time);
    onDepartureTimeChange?.(time);
  };

  if (!departure) {
    return (
      <div className="mb-10 border-b border-gray-300 pb-6 relative" data-testid={`departure-detail-card-${index}`}>
        <p className="text-gray-500">出発地情報が取得できませんでした。</p>
      </div>
    );
  }

  return (
    <div className="mb-10 border-b border-gray-300 pb-6 relative" data-testid={`departure-detail-card-${index}`}>
      {/* スポット情報 */}
      <div className="relative pl-8">
        {/* 番号付き (四角) */}
        <div className="absolute left-0 top-0 w-6 h-6 bg-blue-500 text-white text-xs flex items-center justify-center font-bold rounded-md">
          {index}
        </div>

        {/* スポット名 */}
        <div className="flex items-center space-x-2">
          <MapPin
            className="text-blue-500 w-6 h-6"
            style={{ color: SpotMakerColors[TransportNodeType.DEPARTURE] || '#3b82f6' }}
          />
          <h3 className="font-semibold text-lg">{departure.name}</h3>
        </div>

        <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="departure-time">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>出発時刻: {planningResult?.departureTime ?? DEFAULT_DEPARTURE_TIME}</span>
        </p>

        {departure.nearestStation && (
          <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="departure-nearest-station">
            <Train className="w-4 h-4 text-gray-400" />
            <span>
              最寄駅: {departure.nearestStation.name} (徒歩{departure.nearestStation.walkingTime}分)
            </span>
          </p>
        )}
      </div>

      {/* 移動手段 */}
      <div className="space-y-3 mt-4" data-testid="spot-transport">
        {departure.nearestStation && nextSpot.nearestStation && departure.transportMethodId == 4 && (
          <RouteSummaryNearestStation
            originNearestStation={departure.nearestStation}
            destinationNearestStation={nextSpot.nearestStation}
            activeDepartureTime={activeDepartureTime}
            isReverse={true}
          />
        )}

        <>
          <div className="flex items-center space-x-2 text-gray-600">
            {transportIcons[departure.transportMethod]?.icon || transportIcons.DEFAULT.icon}
            <span>
              {transportIcons[departure.transportMethod]?.label || transportIcons.DEFAULT.label} (
              {departure?.travelTime})
            </span>
            <div className="flex items-center flex-wrap gap-2 ml-2"></div>
            {transportCandidates.length > 0 && (
              <div className="flex flex-wrap gap-2" data-testid="departure-transport-candidates">
                {routeInfo &&
                  transportCandidates
                    .filter((candidate) => candidate.transportMethodId !== departure.transportMethodId)
                    .map((candidate) => (
                      <button
                        key={`${candidate.name}-${candidate.travelTime}`}
                        type="button"
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors cursor-pointer"
                        aria-disabled={candidate.isDisabled ? 'true' : 'false'}
                        onClick={() => fields.switchAlternativeRoute(date, routeInfo.id, candidate.transportMethodId)}
                      >
                        {transportIcons[candidate.transportMethod]?.icon || transportIcons.DEFAULT.icon}
                        <span>
                          {transportIcons[candidate.transportMethod]?.label || transportIcons.DEFAULT.label} (
                          {candidate.travelTime})
                        </span>
                      </button>
                    ))}
              </div>
            )}
          </div>
        </>

        {selectableDepartureCandidates.length > 0 && (
          <div className="text-sm text-gray-600" data-testid="departure-time-candidates">
            <span className="mr-2">他の候補:</span>
            {selectableDepartureCandidates.map((time) => (
              <button
                key={time}
                type="button"
                className="mr-2 underline hover:text-blue-600"
                onClick={() => handleDepartureTimeChange(time)}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
