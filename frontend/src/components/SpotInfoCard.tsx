'use client';

import { Calendar, Clock, ExternalLink, Flag, Home, MapPin, Star } from 'lucide-react';
import Image from 'next/image';

import { Spot, TransportNodeType } from '@/types/plan';
import { convertHHmmToJpFormat } from '@/lib/utils';
import { calculateDuration } from '@/lib/algorithm';

import { placeTypeMap } from '../data/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface SpotCardProps {
  spot: Spot;
}

export function SpotInfoCard({ spot }: SpotCardProps) {
  // 通常のスポットの場合
  return (
    <div className="relative flex gap-10 mb-3 items-center">
      {/* タイムライン部分 */}
      <div className="flex flex-col items-center flex-shrink-0 relative">
        <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md z-10">
          <span className="text-xs">{spot.stayStart}</span>
          <span className="text-[10px]">~</span>
          <span className="text-xs">{spot.stayEnd}</span>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-[200%] bg-gray-300 z-0"></div>

        <div className="absolute top-[calc(100%+30px)] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs text-gray-600 border border-gray-200 shadow-sm whitespace-nowrap z-20 flex items-center gap-1">
          🚗
          <span className="font-semibold">{convertHHmmToJpFormat(spot.transports.travelTime)}</span>
        </div>
      </div>

      {/* カード部分 */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex gap-4 p-4">
            {/* サムネイル画像 */}
            <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={spot.image || '/scene.webp'}
                alt={spot.location.name || ''}
                width={112}
                height={112}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-white/95 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold">{spot.rating ?? '-'}</span>
                {spot.ratingCount !== undefined && <span className="text-xs text-gray-400">({spot.ratingCount})</span>}
              </div>
            </div>

            {/* 情報部分 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{spot.location.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-1">{spot.catchphrase ?? ''}</p>
                </div>
                {/* カテゴリを3つまで表示 */}
                {spot.category && spot.category.length > 0 && (
                  <div className="flex gap-1 flex-shrink-0 flex-wrap" data-testid="spot-categories">
                    {spot.category.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                      >
                        {placeTypeMap[cat] ?? 'その他'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{calculateDuration({ start: spot.stayStart, end: spot.stayEnd })}</span>
                  <span className="text-gray-400">滞在</span>
                </div>
                {spot.nearestStation && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600" data-testid="spot-nearest-station">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">徒歩{spot.nearestStation.walkingTime ?? '-'}分</span>
                  </div>
                )}
              </div>

              {/* 住所 */}
              {spot.address && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2" data-testid="spot-address">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{spot.address}</span>
                </div>
              )}

              <p className="text-sm text-gray-600 line-clamp-2">{spot.description}</p>

              {/* 外部URL */}
              {spot.url && (
                <div className="mt-2">
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
                <div className="mt-2" data-testid="spot-opening-hours">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="opening-hours" className="border-none">
                      <AccordionTrigger className="py-1 hover:no-underline">
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

              {/* メモ */}
              {spot.memo && <p className="text-sm text-gray-500 mt-2 italic">{spot.memo}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
