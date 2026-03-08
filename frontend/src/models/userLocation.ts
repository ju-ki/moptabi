/**
 * ユーザーお気に入り地点の型定義
 */

// ラベルの選択肢
export const LOCATION_LABELS = ['自宅', '駅・バス停', '実家', '旅の拠点', 'その他'] as const;
export type LocationLabel = (typeof LOCATION_LABELS)[number];

// 最大登録件数
export const MAX_USER_LOCATIONS = 5;

// ユーザーお気に入り地点
export interface UserLocation {
  id: number;
  userId: string;
  name: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  label: string | null;
  usageCount: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// 作成時のリクエスト
export interface CreateUserLocationRequest {
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  label?: string | null;
  isDefault?: boolean;
}

// 更新時のリクエスト
export interface UpdateUserLocationRequest {
  id: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string | null;
  label?: string | null;
  isDefault?: boolean;
}
