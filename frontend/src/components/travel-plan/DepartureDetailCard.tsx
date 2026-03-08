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
 * DepartureDetailCardコンポーネントのプロパティ
 */
interface DepartureDetailCardProps {
  /** 出発地情報 */
  departure: DepartureAndDestinationType;
  /** 表示インデックス（0始まり） */
  index: number;
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
export default function DepartureDetailCard({ departure, index }: DepartureDetailCardProps) {
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

        {/* 住所 */}
        {departure.address && (
          <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="spot-address">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{departure.address}</span>
          </p>
        )}
      </div>

      {/* 移動手段 */}
      <div className="flex items-center space-x-2 text-gray-600 mt-4" data-testid="spot-transport">
        {transportIcons[departure?.transports?.name as TravelModeType]?.icon || 'ℹ️'}
        <span>
          {transportIcons[departure?.transports?.name as TravelModeType]?.label || transportIcons.DEFAULT.label} (
          {departure?.transports?.travelTime})
        </span>
      </div>
    </div>
  );
}
