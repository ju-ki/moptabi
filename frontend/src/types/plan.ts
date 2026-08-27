import { OpeningHoursType, SpotMetaType, TripSpotType } from '@shared/spot/types';
import { NearestStationType } from '@shared/nearestStation/types';
import { PlanLocationType } from '@shared/planlocation/types';
import { TripType } from '@shared/trip/types';

import { AlternativeRouteInfo } from '@/lib/planning';
import type { CoordinationType } from '@/models/plan';
import { placeTypeMap } from '@/data/constants';

export type Coordination = CoordinationType;

export type Transport = {
  transportMethod: number;
  name: TravelModeType; // 例: "電車" | "バス"
  cost?: number;
  travelTime?: string; // 例: "30分"
  fromType: SpotType;
  toType: SpotType;
};

export enum TransportNodeType {
  DEPARTURE = 'DEPARTURE',
  DESTINATION = 'DESTINATION',
  SPOT = 'SPOT',
}

export type SpotType = 'SPOT' | 'DEPARTURE' | 'DESTINATION';

/**
 * 共通の型を画面上で扱うように拡張した型
 */
export type ExtendNearestStationType = NearestStationType & {
  spotId?: string; //  スポットのID
  name: string; // 最寄駅の名前
  walkingTime?: number; // 徒歩時間（分）
  latitude: number;
  longitude: number;
  /** 手入力フラグ - trueの場合はユーザーが入力した値 */
  isManualTransitTime?: boolean;
  /** 電車/バスの発車時間候補（最大3件） */
  scheduledDepartureTimes?: string[];
  /** 駅での待機時間（分）- 自動計算または手入力 */
  waitingTime?: number;
  distance?: number; // メートル
  /** 移動手段 */
  transportMethodId?: number;
};

/**
 * 最寄駅情報の型
 */
type SpotRouteDraft = {
  transportType?: 'WALK' | 'CAR' | 'TRAIN' | 'BUS' | 'OTHER'; //移動手段
  transitTime?: number; //移動時間
  waitingTime?: number; // 待機時間
  scheduledDepartureTime?: string;
  scheduledDepartureTimes?: string[]; //発車時間の候補
  memo?: string; //メモ
};

export type Spot = {
  id: string;
  clientRef?: string;
  location: Coordination;
  stayStart: string;
  stayEnd: string;
  stayDuration: number; //滞在時間
  transports?: Transport;
  url?: string;
  memo?: string;
  image?: string; // 画像URL(省略可能)
  rating?: number; // 例: 4.7
  category?: string[]; // 例: ["文化", "歴史"]
  catchphrase?: string; // キャッチコピー
  description?: string; // 説明文
  prefecture?: string; // 都道府県
  address?: string;
  ratingCount?: number;
  regularOpeningHours?: OpeningHoursType;
  nearestStation?: ExtendNearestStationType; // 最寄駅
  routeToNext?: SpotRouteDraft;
  alternateRoutes?: AlternativeRouteInfo[]; // 代替ルートの候補
  order: number;
  // 行きたいリスト用のプロパティ
  priority?: number; // 優先度（1-5）
  createdAt?: string; // 登録日時
  // 過去のスポット用のプロパティ
  visitCount?: number; // 訪問回数
  visitedAt?: string; // 前回訪問日時
  planDate?: string; // 計画日
  planTitle?: string; // 計画タイトル
};

export type ExtendSpotType = TripSpotType &
  SpotMetaType & {
    routeToNext?: SpotRouteDraft;
    nearestStation?: ExtendNearestStationType;
    alternateRoutes?: AlternativeRouteInfo[];
    // 行きたいリスト用のプロパティ
    priority?: number; // 優先度（1-5）
    createdAt?: string; // 登録日時
    // 過去のスポット用のプロパティ
    visitCount?: number; // 訪問回数
    visitedAt?: string; // 前回訪問日時
    planDate?: string; // 計画日
    planTitle?: string; // 計画タイトル
  };

export type ExtendPlanLocationType = PlanLocationType & {
  nearestStation?: ExtendNearestStationType;
  alternativeTransports?: AlternativeRouteInfo[];
  alternateRoutes?: AlternativeRouteInfo[];
};

export type TravelPlanType = {
  date: string;
  memo?: string;
  spots: ExtendSpotType[];
  departure: ExtendPlanLocationType;
  destination: ExtendPlanLocationType;
};

export type ExtendTripType = TripType & {
  plans: TravelPlanType[];
};

export type PlanErrorType = 'spots' | 'departure' | 'destination' | 'transportationMethod' | 'genreId' | 'memo';

export type PlaceTypeGroupKey = keyof typeof placeTypeMap;

export type SortOption = 'popularity' | 'distance';

export type SearchSpotByCategoryParams = {
  genreIds?: PlaceTypeGroupKey[]; //ジャンルリスト
  center?: Coordination; //基準となる地点
  radius: number; //半径
  sortOption: SortOption; //ソートオプション
  maxResultLimit: number; //最大取得件数
  searchWord?: string; //検索ワード
};

export type TravelModeType = 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING' | 'DEFAULT';

export type TravelModeTypeForDisplay = Partial<{
  [key in TravelModeType]: {
    icon: React.ReactNode;
    label: string;
  };
}>;
