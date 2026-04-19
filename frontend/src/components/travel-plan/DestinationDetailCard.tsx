'use client';

import { MapPin, Train, FootprintsIcon, Car, Bike, CircleHelp } from 'lucide-react';

import { Spot, TransportNodeType, TravelModeType } from '@/types/plan';
import { SpotMakerColors } from '@/data/constants';
import { DepartureAndDestinationType } from '@/models/planLocation';

/**
 * 移動手段のアイコンと表示名のマッピング
 */
const transportIcons: Record<TravelModeType | 'DEFAULT', { icon: JSX.Element; label: string }> = {
  WALKING: { icon: <FootprintsIcon className="w-5 h-5 text-yellow-500" />, label: '徒歩' },
  TRANSIT: { icon: <Train className="w-5 h-5 text-blue-500" />, label: '電車' },
  DRIVING: { icon: <Car className="w-5 h-5 text-gray-700" />, label: '車' },
  BICYCLING: { icon: <Bike className="w-5 h-5 text-green-500" />, label: '自転車' },
  DEFAULT: { icon: <CircleHelp className="w-5 h-5 text-gray-400" />, label: '不明' },
};

/**
 * DestinationDetailCardコンポーネントのプロパティ
 */
interface DestinationDetailCardProps {
  /** 目的地情報 */
  destination: DepartureAndDestinationType;
  /** 表示インデックス（0始まり） */
  index: number;
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
export default function DestinationDetailCard({ destination, index }: DestinationDetailCardProps) {
  return (
    <div className="my-10 border-t border-gray-300 py-8 relative" data-testid={`destination-detail-card-${index}`}>
      {/* 移動手段 */}
      <div className="flex items-center space-x-2 text-gray-600 my-4" data-testid="spot-transport">
        {transportIcons[destination?.transports?.name as TravelModeType]?.icon || 'ℹ️'}
        <span>
          {transportIcons[destination?.transports?.name as TravelModeType]?.label || transportIcons.DEFAULT.label} (
          {destination?.transports?.travelTime})
        </span>
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

        {/* 住所 */}
        {destination.address && (
          <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="spot-address">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{destination.address}</span>
          </p>
        )}
      </div>
    </div>
  );
}
