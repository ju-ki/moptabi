'use client';

import { MapPin, Clock, Train, FootprintsIcon, X, Car, Bike, CircleHelp, ExternalLink, Calendar } from 'lucide-react';
import Image from 'next/image';

import { Spot, TransportNodeType, TravelModeType } from '@/types/plan';
import { placeTypeMap, SpotMakerColors } from '@/data/constants';

import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

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
 * SpotDetailCardコンポーネントのプロパティ
 */
interface SpotDetailCardProps {
  /** スポット情報 */
  spot: Spot;
  /** 表示インデックス（0始まり） */
  index: number;
  /** 削除ボタン押下時のコールバック */
  onDelete: (id: string) => void;
  /** メモ変更時のコールバック */
  onMemoChange: (memo: string) => void;
  /** 移動情報を表示するか（デフォルト: true） */
  showTransport?: boolean;
  /** 削除ボタンを表示するか（デフォルト: true） */
  showDeleteButton?: boolean;
}

/**
 * スポット詳細カードコンポーネント
 *
 * 旅行計画プレビュー画面で各スポットの詳細情報を表示します。
 *
 * 表示内容（画面設計書より）:
 * - 各スポットの名称
 * - 各スポットの滞在時間
 * - 各スポットのイメージ画像(仮画像)
 * - 評価
 * - カテゴリ(3つまで)
 * - 各スポットの説明
 * - 各スポットの外部URL
 * - 各スポットの営業時間
 * - 各スポットのメモ機能
 * - 各スポットの住所
 * - 各スポットの間の移動時間と交通手段表示
 * - 各スポットの個別削除機能
 */
export default function SpotDetailCard({
  spot,
  index,
  onDelete,
  onMemoChange,
  showTransport = true,
  showDeleteButton = true,
}: SpotDetailCardProps) {
  // 出発地または目的地かどうかを判定
  const isDepartureOrDestination =
    spot.transports.fromType === TransportNodeType.DEPARTURE ||
    spot.transports.toType === TransportNodeType.DESTINATION;

  // 通常のスポット（出発地・目的地以外）かどうか
  const isRegularSpot = !isDepartureOrDestination;

  return (
    <div className="mb-10 border-b border-gray-300 pb-6 relative" data-testid={`spot-detail-card-${spot.id}`}>
      {/* 削除ボタン */}
      {showDeleteButton && isRegularSpot && (
        <Button
          variant="ghost"
          onClick={() => onDelete(spot.id || '')}
          className="absolute top-0 right-0 cursor-pointer z-50"
          aria-label="削除"
        >
          <X className="w-4 h-4 text-red-500 cursor-pointer z-50" />
        </Button>
      )}

      {/* スポット情報 */}
      <div className="relative pl-8">
        {/* 番号付き (四角) */}
        <div className="absolute left-0 top-0 w-6 h-6 bg-blue-500 text-white text-xs flex items-center justify-center font-bold rounded-md">
          {index + 1}
        </div>

        {/* スポット名 */}
        <div className="flex items-center space-x-2">
          <MapPin
            className="text-blue-500 w-6 h-6"
            style={{ color: SpotMakerColors[spot.transports.fromType] || '#3b82f6' }}
          />
          <h3 className="font-semibold text-lg">{spot.location.name}</h3>
        </div>

        {/* 通常のスポットのみ詳細情報を表示 */}
        {isRegularSpot && (
          <>
            {/* 滞在時間 */}
            <p className="text-gray-500 flex items-center space-x-1 mt-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>
                {spot.stayStart} - {spot.stayEnd}
              </span>
            </p>

            {/* 最寄駅情報 */}
            {spot.nearestStation && (
              <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="spot-nearest-station">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>
                  最寄駅: {spot.nearestStation.name}（徒歩: {spot.nearestStation.walkingTime}分）
                </span>
              </p>
            )}

            {/* 住所 */}
            {spot.address && (
              <p className="text-gray-500 flex items-center space-x-1 mt-1" data-testid="spot-address">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{spot.address}</span>
              </p>
            )}

            {/* イメージ画像 */}
            {spot.image && (
              <div className="mt-4">
                <Image
                  src={spot.image}
                  alt={spot.location.name || ''}
                  width={300}
                  height={200}
                  className="rounded-lg shadow-md"
                />
              </div>
            )}

            {/* 口コミ評価 */}
            {spot.rating !== undefined && (
              <div className="mt-4 flex items-center" data-testid="spot-rating">
                <span className="text-yellow-500 text-lg">★</span>
                <span className="ml-1 font-semibold">{spot.rating}</span>
                {spot.ratingCount !== undefined && (
                  <span className="ml-2 text-gray-400 text-sm">({spot.ratingCount}件)</span>
                )}
              </div>
            )}

            {/* カテゴリ */}
            {spot.category && spot.category.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" data-testid="spot-categories">
                {spot.category.slice(0, 3).map((cat, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {placeTypeMap[cat] ?? 'その他'}
                  </span>
                ))}
              </div>
            )}

            {/* 説明 (吹き出し風) */}
            {(spot.catchphrase || spot.description) && (
              <div className="mt-4 bg-gray-100 p-3 rounded-lg shadow-sm">
                {spot.catchphrase && <p className="mb-2 text-sm font-semibold text-gray-700">{spot.catchphrase}</p>}
                {spot.description && <p className="text-gray-600 text-sm">{spot.description}</p>}
              </div>
            )}

            {/* 外部URL */}
            {spot.url && (
              <div className="mt-3">
                <a
                  href={spot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  外部サイトを見る
                </a>
              </div>
            )}

            {/* 営業時間 */}
            {spot.regularOpeningHours && spot.regularOpeningHours.length > 0 && (
              <div className="mt-3" data-testid="spot-opening-hours">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="opening-hours" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        営業時間
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {spot.regularOpeningHours.map((item, idx) => (
                          <li key={idx}>
                            {item.day}: {item.hours}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            <div className="border-b mt-4"></div>
          </>
        )}

        {/* メモ機能 */}
        <div className="mt-4 border-gray-300 py-6">
          <Label className="font-semibold text-lg">メモ</Label>
          <Textarea
            placeholder="この観光スポットに対するメモや注意点を記載"
            value={spot.memo || ''}
            onChange={(e) => onMemoChange(e.target.value)}
          />
        </div>
      </div>

      {/* 移動手段 */}
      {showTransport && (
        <div className="flex items-center space-x-2 text-gray-600 mb-4" data-testid="spot-transport">
          {transportIcons[spot.transports.name]?.icon || transportIcons.DEFAULT.icon}
          <span>
            {transportIcons[spot.transports.name]?.label || transportIcons.DEFAULT.label} ({spot.transports.travelTime})
          </span>
        </div>
      )}
    </div>
  );
}
