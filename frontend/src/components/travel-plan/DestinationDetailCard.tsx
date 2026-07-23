'use client';

import { useMemo, useState } from 'react';
import { MapPin, Train, FootprintsIcon, Car, Bike, CircleHelp, Clock } from 'lucide-react';

import { TransportNodeType, TravelModeType } from '@/types/plan';
import { DEFAULT_ARRIVAL_TIME, SpotMakerColors } from '@/data/constants';
import { useStoreForPlanning } from '@/lib/plan';

/**
 * 移動手段のアイコンと表示名のマッピング
 */
const transportIcons: Record<TravelModeType | 'DEFAULT', { icon: JSX.Element; label: string }> = {
  WALKING: { icon: <FootprintsIcon className="w-5 h-5 text-yellow-500" />, label: '徒歩' },
  TRANSIT: { icon: <Train className="w-5 h-5 text-blue-500" />, label: '最寄駅/バス停経由' },
  DRIVING: { icon: <Car className="w-5 h-5 text-gray-700" />, label: '車' },
  BICYCLING: { icon: <Bike className="w-5 h-5 text-green-500" />, label: '自転車' },
  DEFAULT: { icon: <CircleHelp className="w-5 h-5 text-gray-400" />, label: '不明' },
};

/**
 * DestinationDetailCardコンポーネントのプロパティ
 */
interface DestinationDetailCardProps {
  date: string;
  /** 表示インデックス（0始まり） */
  index: number;
  /** 発車時間候補 */
  departureTimeCandidates?: string[];
  /** 移動手段切替 */
  onTransportChange?: (name: TravelModeType) => void;
  /** 発車時間切替 */
  onDepartureTimeChange?: (time: string) => void;
}

/**
 * DestinationDetailCardコンポーネント
 *
 * 旅行計画プレビュー画面で目的地の詳細情報を表示します。
 *
 * 表示内容（画面設計書より）:
 * - 目的地の名称
 * - 目的地の住所
 * - 目的地までの移動時間と交通手段表示
 */
export default function DestinationDetailCard({
  date,
  index,
  departureTimeCandidates = [],
  onDepartureTimeChange,
}: DestinationDetailCardProps) {
  const fields = useStoreForPlanning();
  // ストアから最新の出発地情報を取得（代替ルート切り替え時に更新された値を反映するため）
  const destination = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);

  const previousSpot = fields.getSpotInfo(date, null).slice(-1)[0];
  const transportCandidates =
    destination?.alternativeTransports?.map((transport) => ({
      name: transport.transportMethod as TravelModeType,
      travelTime: transport.durationText,
      transportMethodId: transport.transportMethodId,
      isDisabled: false, //TODO: 仮
    })) ?? [];
  const planningResult = fields.getPlanningResult(date);
  const routeInfo = planningResult?.routes?.find((r) => r.fromType === 'SPOT' && r.toType === 'DESTINATION');
  const [activeDepartureTime, setActiveDepartureTime] = useState<string>(
    planningResult?.updatedDestination.nearestStation?.scheduledDepartureTime ?? DEFAULT_ARRIVAL_TIME,
  );

  const selectableDepartureCandidates = useMemo(
    () => departureTimeCandidates.filter((time) => time !== activeDepartureTime),
    [departureTimeCandidates, activeDepartureTime],
  );

  const handleDepartureTimeChange = (time: string) => {
    setActiveDepartureTime(time);
    onDepartureTimeChange?.(time);
  };

  if (!destination) {
    return (
      <div className="mb-10 border-b border-gray-300 pb-6 relative" data-testid={`destination-detail-card-${index}`}>
        <p className="text-gray-500">目的地情報が取得できませんでした。</p>
      </div>
    );
  }

  return (
    <div className="my-10 border-t border-gray-300 py-8 relative" data-testid={`destination-detail-card-${index}`}>
      {/* 移動手段 */}
      <div className="space-y-3 my-4" data-testid="spot-transport">
        {previousSpot?.nearestStation && destination.nearestStation && destination.transports?.transportMethod == 4 && (
          <div className="relative pl-4 border-l-2 border-blue-200 space-y-3">
            {/* 出発地から最寄駅へ（徒歩） */}
            <div className="relative">
              <div className="absolute -left-[21px] w-3 h-3 bg-orange-400 rounded-full" />
              <div className="flex items-center gap-2 text-sm">
                <FootprintsIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-600">徒歩 {previousSpot.nearestStation.walkingTime}分</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-orange-600">{destination.nearestStation.name}</span>
              </div>
            </div>

            {/* 電車/バスでの移動 */}
            <div className="relative">
              <div className="absolute -left-[21px] w-3 h-3 bg-green-400 rounded-full" />
              <div className="flex items-center gap-2 text-sm">
                <Train className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">電車/バス {previousSpot.nearestStation.transitTime}分</span>
                {activeDepartureTime && (
                  <p className="text-sm text-gray-400" data-testid="destination-selected-time">
                    (発車: {activeDepartureTime})
                  </p>
                )}
              </div>
            </div>

            {/* 到着駅から最初のスポットへ（徒歩） */}
            <div className="relative">
              <div className="absolute -left-[21px] w-3 h-3 bg-blue-400 rounded-full" />
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-blue-600">{destination.nearestStation.name}</span>
                <span className="text-gray-400">→</span>
                <FootprintsIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-600">徒歩 {destination.nearestStation.walkingTime}分</span>
              </div>
            </div>
          </div>
        )}
        {destination.transports && (
          <>
            <div className="flex items-center space-x-2 text-gray-600">
              {transportIcons[destination.transports.name as TravelModeType]?.icon || transportIcons.DEFAULT.icon}
              <span>
                {transportIcons[destination.transports.name as TravelModeType]?.label || transportIcons.DEFAULT.label} (
                {destination?.transports?.travelTime})
              </span>
              <div className="flex items-center flex-wrap gap-2 ml-2"></div>
              {routeInfo && transportCandidates.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="destination-transport-candidates">
                  {transportCandidates
                    .filter((candidate) => candidate.transportMethodId !== destination?.transports?.transportMethod)
                    .map((candidate) => (
                      <button
                        key={`${candidate.name}-${candidate.travelTime}`}
                        type="button"
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors cursor-pointer"
                        onClick={() => fields.switchAlternativeRoute(date, routeInfo.id, candidate.transportMethodId)}
                      >
                        {transportIcons[candidate.name]?.icon || transportIcons.DEFAULT.icon}
                        <span>
                          {transportIcons[candidate.name]?.label || transportIcons.DEFAULT.label} (
                          {candidate.travelTime})
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {selectableDepartureCandidates.length > 0 && (
          <div className="text-sm text-gray-600" data-testid="destination-time-candidates">
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
            style={{ color: SpotMakerColors[TransportNodeType.DESTINATION] || '#3b82f6' }}
          />
          <h3 className="font-semibold text-lg">{destination.name}</h3>
        </div>

        <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="destination-time">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>到着時刻: {planningResult?.arrivalTime ?? DEFAULT_ARRIVAL_TIME}</span>
        </p>

        {destination.nearestStation && (
          <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="destination-nearest-station">
            <Train className="w-4 h-4 text-gray-400" />
            <span>
              最寄駅: {destination.nearestStation.name} (徒歩{destination.nearestStation.walkingTime}分)
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
