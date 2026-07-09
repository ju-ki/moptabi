/**
 * 移動手段の個別設定機能用ユーティリティ関数
 * No.229_移動手段の個別設定機能
 */

import type { NearestStation } from '@/types/nearestStation';

import { THRESHOLD_FOR_DISTANCE } from './constants';

/**
 * 時間をフォーマット
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
}

/**
 * 2点間の距離を計算（Haversine公式）
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 徒歩時間を推定（80m/分として計算）
 */
export function estimateWalkingTime(distanceMeters: number): number {
  return Math.ceil(distanceMeters / 80);
}

/**
 * 公共交通機関での移動時間を簡易推定
 * 直線距離から概算（実際の乗換案内で調べることを推奨）
 *
 * 計算ロジック:
 * - 基本速度: 電車は約40km/h（都市部の平均）
 * - 待ち時間: 平均2分(1.5kmごと)
 *
 * @param distanceMeters 直線距離（メートル）
 * @returns 推定移動時間（分）
 */
export function estimateTransitTime(distanceMeters: number): number {
  if (distanceMeters <= 0) return 0;

  const distanceKm = distanceMeters / 1000;

  // 基本移動時間（40km/h = 1km あたり 1.5分）
  const travelTime = distanceKm * 1.5;

  // 待ち時間
  const waitingTime = Math.ceil(distanceKm / 1.5) * 2;

  return Math.ceil(travelTime + waitingTime);
}

/**
 * 最寄駅の取得推奨判定（1.5km以上離れている場合）
 */
export function shouldRecommendNearestStation(distanceMeters: number): boolean {
  return distanceMeters >= THRESHOLD_FOR_DISTANCE;
}

// NearestStation型を再エクスポート（後方互換性のため）
export type { NearestStation };
