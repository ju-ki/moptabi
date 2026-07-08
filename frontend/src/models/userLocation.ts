/**
 * ユーザーお気に入り地点の型定義
 */
import { LOCATION_LABELS, MAX_USER_LOCATIONS } from '@shared/user/types';

import type { CreateUserLocationType, LocationLabel, UpdateUserLocationType } from '@shared/user/types';

export { LOCATION_LABELS, MAX_USER_LOCATIONS };
export type { LocationLabel };

// ユーザーお気に入り地点（フロントエンド表示用: 日付フィールドは文字列として扱う）
export interface UserLocation {
  id: number;
  userId: string;
  name: string | null;
  latitude: number;
  longitude: number;
  label: string | null;
  usageCount: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// 作成時のリクエスト
export type CreateUserLocationRequest = CreateUserLocationType;

// 更新時のリクエスト（id は URL パスパラメータから取得するため追加）
export type UpdateUserLocationRequest = UpdateUserLocationType & { id: number };
