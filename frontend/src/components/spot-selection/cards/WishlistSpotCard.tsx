'use client';
import { Star, MapPin, Check, Link as LinkIcon, Calendar } from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spot } from '@/types/plan';
import { formatTimeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { placeTypeMap } from '@/data/constants';

/**
 * 行きたいリスト用のスポットカード
 * 表示内容: 画像、スポット名、評価、住所、外部リンク、登録日時
 */
interface WishlistSpotCardProps {
  place: Spot;
  onSpotClick?: (spot: Spot) => void;
  isSpotSelected: (spotId: string) => boolean;
  viewMode?: 'list' | 'split' | 'map';
}

const WishlistSpotCard = ({ place, onSpotClick, isSpotSelected, viewMode = 'list' }: WishlistSpotCardProps) => {
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

  const handleClickSpot = (spot: Spot) => {
    onSpotClick?.(spot);
  };

  const isAdded = isSpotSelected(place.id);
  const isHovered = hoveredPlaceId === place.id;
  const isSplitMode = viewMode === 'split';

  return (
    <div className="w-full">
      <Button
        type="button"
        variant={'outline'}
        data-testid={`wishlist-spot-card-${place.id}`}
        data-selected={isAdded}
        className={`
          relative w-full h-auto p-0 overflow-hidden
          border-2 rounded-xl transition-all duration-300
          ${
            isAdded
              ? 'border-green-500 bg-green-50/50 shadow-sm'
              : isHovered
                ? 'border-gray-300 bg-white shadow-lg scale-[1.02]'
                : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
          }
        `}
        onClick={() => handleClickSpot(place)}
        onMouseEnter={() => setHoveredPlaceId(place.id)}
        onMouseLeave={() => setHoveredPlaceId(null)}
      >
        <div className={`flex gap-3 w-full ${isSplitMode ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}`}>
          {/* 画像 */}
          <div
            className={`relative flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm ${
              isSplitMode ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-24 sm:h-24'
            }`}
          >
            <Image
              width={100}
              height={100}
              src={place.image || '/placeholder.jpg'}
              alt={place.location.name || ''}
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
            />
            {isAdded && (
              <div className="absolute inset-0 bg-green-500/20 backdrop-blur-[1px] flex items-center justify-center">
                <div className={`bg-green-500 rounded-full shadow-lg ${isSplitMode ? 'p-1' : 'p-1.5'}`}>
                  <Check size={isSplitMode ? 14 : 16} className="text-white" strokeWidth={3} />
                </div>
              </div>
            )}
          </div>

          {/* コンテンツ */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            {/* スポット名 & 選択済みバッジ */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 w-full">
                <h4
                  className={`font-bold text-gray-900 line-clamp-2 leading-snug flex-1 min-w-0 text-left ${
                    isSplitMode ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                  }`}
                  data-testid={`wishlist-spot-name-${place.id}`}
                >
                  {place.location.name}
                </h4>
                {isAdded && (
                  <div
                    className={`flex-shrink-0 bg-green-500 text-white font-semibold rounded-full flex items-center gap-1 shadow-sm ${
                      isSplitMode ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
                    }`}
                  >
                    <Check size={isSplitMode ? 10 : 12} strokeWidth={3} />
                    <span>選択済み</span>
                  </div>
                )}
              </div>

              {/* 評価 */}
              {place.rating && (
                <div
                  className={`flex items-center gap-1.5 bg-yellow-50 rounded-lg border my-4 border-yellow-200 w-fit ${
                    isSplitMode ? 'px-1.5 py-0.5' : 'px-2 py-1'
                  }`}
                  data-testid={`wishlist-spot-rating-${place.id}`}
                >
                  <Star size={isSplitMode ? 12 : 14} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <span className={`font-bold text-gray-900 ${isSplitMode ? 'text-xs' : 'text-sm'}`}>
                    {place.rating}
                  </span>
                </div>
              )}
            </div>

            {/* カテゴリ */}
            {place.category && place.category.length > 0 && (
              <div
                className={`flex items-center gap-1.5 rounded-lg mt-4 w-fit ${
                  isSplitMode ? 'px-1.5 py-0.5' : 'px-2 py-1'
                }`}
                data-testid={`wishlist-spot-category-${place.id}`}
              >
                {place.category.slice(0, 3).map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs font-medium">
                    {placeTypeMap[t] ?? 'その他'}
                  </Badge>
                ))}
              </div>
            )}

            {/* 住所 */}
            {place.address && (
              <div className={`flex items-start gap-1.5 ${isSplitMode ? 'mt-1.5' : 'mt-2'}`}>
                <MapPin size={isSplitMode ? 12 : 14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p
                  className={`text-gray-600 line-clamp-2 leading-relaxed text-left ${
                    isSplitMode ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                  }`}
                  data-testid={`wishlist-spot-address-${place.id}`}
                >
                  {place.address}
                </p>
              </div>
            )}

            {/* 外部リンク */}
            {place.url && (
              <div className={`flex items-center gap-1.5 ${isSplitMode ? 'mt-1' : 'mt-1.5'}`}>
                <LinkIcon size={isSplitMode ? 12 : 14} className="text-blue-500 flex-shrink-0" />
                <a
                  href={place.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`text-blue-600 hover:underline ${isSplitMode ? 'text-xs' : 'text-sm'}`}
                  data-testid={`wishlist-spot-url-${place.id}`}
                >
                  外部リンク
                </a>
              </div>
            )}

            {/* 登録日時 */}
            {place.createdAt && (
              <div className={`flex items-center gap-1.5 ${isSplitMode ? 'mt-1' : 'mt-1.5'}`}>
                <Calendar size={isSplitMode ? 12 : 14} className="text-gray-400 flex-shrink-0" />
                <span
                  className={`text-gray-500 ${isSplitMode ? 'text-[10px]' : 'text-xs'}`}
                  data-testid={`wishlist-spot-created-at-${place.id}`}
                >
                  登録: {formatTimeDate(place.createdAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Button>
    </div>
  );
};

export default WishlistSpotCard;
