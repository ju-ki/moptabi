'use client';

import { useMemo, useState } from 'react';
import { MapPin, Train, FootprintsIcon, Car, Bike, CircleHelp, Clock } from 'lucide-react';

import { TransportNodeType, TravelModeType } from '@/types/plan';
import { DEFAULT_ARRIVAL_TIME, SpotMakerColors } from '@/data/constants';
import { useStoreForPlanning } from '@/lib/plan';
import { formatDurationAsHourMinute } from '@/lib/planning';

import type { TransportMethodType } from '@shared/transports/types';

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
export default function DestinationDetailCard({ date, index }: DestinationDetailCardProps) {
  const fields = useStoreForPlanning();
  // ストアから最新の出発地情報を取得（代替ルート切り替え時に更新された値を反映するため）
  const destination = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const planningResult = fields.getPlanningResult(date);

  if (!destination) {
    return (
      <div className="mb-10 border-b border-gray-300 pb-6 relative" data-testid={`destination-detail-card-${index}`}>
        <p className="text-gray-500">目的地情報が取得できませんでした。</p>
      </div>
    );
  }

  return (
    <div className="my-10 border-gray-300 py-8 relative" data-testid={`destination-detail-card-${index}`}>
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
              最寄駅: {destination.nearestStation.name} (徒歩
              {formatDurationAsHourMinute(destination.nearestStation.walkingTime ?? 0)})
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
