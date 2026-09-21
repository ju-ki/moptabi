import React from 'react';
import { FootprintsIcon, Train } from 'lucide-react';

import { ExtendNearestStationType } from '@/types/plan';

/**
 * 最寄駅経由のルート概要を表示するコンポーネント
 * 表示内容:
 * - 前スポットから最寄駅までの移動手段と所要時間と距離
 * - 最寄駅での乗り換え情報（乗車駅、降車駅、乗車時間、発車時間）
 * - 最寄駅から目的地までの移動手段と所要時間と距離
 * - 路線メモ
 * 使用箇所:
 * - 旅行計画プレビュー画面
 * - 旅行計画詳細画面
 * @returns
 */

interface RouteSummaryNearestStationProps {
  originNearestStation: ExtendNearestStationType; // 出発地の最寄駅情報
  // 目的地と被るがあくまでoriginの対義語としての意味合い
  destinationNearestStation: ExtendNearestStationType; // 目的地の最寄駅情報
  activeDepartureTime: string; // 発車時間
}
const RouteSummaryNearestStation = ({
  originNearestStation,
  destinationNearestStation,
  activeDepartureTime,
}: RouteSummaryNearestStationProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6" data-testid="spot-station-breakdown">
      {/* メインのタイムライン */}
      <div className="relative pl-3 sm:pl-4 border-l-2 border-blue-200 space-y-2 sm:space-y-3 flex-1">
        {/* 出発地から最寄駅へ（徒歩） */}
        <div className="relative">
          <div className="absolute -left-[13px] sm:-left-[21px] w-2 sm:w-3 h-2 sm:h-3 bg-orange-400 rounded-full" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <FootprintsIcon className="w-3 sm:w-4 h-3 sm:h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-gray-600">徒歩 {originNearestStation.walkingTime}分</span>
            </div>
            <span className="hidden sm:inline text-gray-400">→</span>
            <span className="font-medium text-orange-600 truncate">{originNearestStation.name}</span>
          </div>
        </div>

        {/* 電車/バスでの移動 */}
        <div className="relative">
          <div className="absolute -left-[13px] sm:-left-[21px] w-2 sm:w-3 h-2 sm:h-3 bg-green-400 rounded-full" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <Train className="w-3 sm:w-4 h-3 sm:h-4 text-green-600 flex-shrink-0" />
              <span className="text-gray-600">電車/バス {originNearestStation.transitTime}分</span>
            </div>
            {activeDepartureTime && (
              <p className="text-xs text-gray-400 ml-4 sm:ml-0" data-testid="departure-selected-time">
                (発車: {activeDepartureTime})
              </p>
            )}
          </div>
        </div>

        {/* 到着駅から最初のスポットへ（徒歩） */}
        <div className="relative">
          <div className="absolute -left-[13px] sm:-left-[21px] w-2 sm:w-3 h-2 sm:h-3 bg-blue-400 rounded-full" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <span className="font-medium text-blue-600 truncate">{destinationNearestStation.name}</span>
            <span className="hidden sm:inline text-gray-400">→</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <FootprintsIcon className="w-3 sm:w-4 h-3 sm:h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-gray-600">徒歩 {destinationNearestStation.walkingTime}分</span>
            </div>
          </div>
        </div>
      </div>

      {/* 路線メモ */}

      {originNearestStation.memo && (
        <div className="sm:flex-1">
          <div className="p-3 sm:p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <h4 className="text-xs sm:text-sm font-bold text-yellow-800 mb-2">路線メモ</h4>
            <p className="text-xs sm:text-sm text-yellow-700 break-words">{originNearestStation.memo}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteSummaryNearestStation;
