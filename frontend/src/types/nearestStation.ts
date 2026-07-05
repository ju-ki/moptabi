/**
 * 最寄駅関連の型定義
 * No.229_移動手段の個別設定機能で使用
 */

/**
 * 駅の種類
 */
export type StationType = 'BUS' | 'TRAIN' | 'OTHER';

/**
 * 駅種別のラベル
 */
export const StationTypeLabels: Record<StationType, string> = {
  BUS: 'バス停',
  TRAIN: '駅',
  OTHER: 'その他',
};

/**
 * 最寄駅情報
 */
export type NearestStation = {
  id?: number;
  spotId: string;
  placeId: string;
  stationType: StationType;
  // Google Maps APIから取得する情報（表示用）
  name?: string;
  distance?: number; // メートル
  walkingTime?: number; // 分
  latitude: number;
  longitude: number;
};
