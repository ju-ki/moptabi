import z from 'zod';

import { placeTypeMap } from '@/data/constants';
import type { CoordinationType } from '@/models/plan';
import { OpeningHoursSchema } from '@/models/spot';
import { DepartureAndDestinationType } from '@/models/planLocation';
import { AlternativeRouteInfo } from '@/lib/planning';

import { StationType } from './nearestStation';

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

export type NearestStation = {
  spotId?: string; //  スポットのID
  placeId: string; //最寄駅のID
  name?: string; // 最寄駅の名前
  stationType: StationType; // 最寄駅の種別（例: "TRAIN", "BUS"）
  walkingTime?: number; // 徒歩時間（分）
  latitude: number;
  longitude: number;
  /** 公共交通機関での移動時間（分）- 次のスポットの最寄駅までの時間 */
  transitTime?: number;
  /** 手入力フラグ - trueの場合はユーザーが入力した値 */
  isManualTransitTime?: boolean;
  /** 電車/バスの発車時間（HH:mm形式） */
  scheduledDepartureTime?: string;
  /** 電車/バスの発車時間候補（最大3件） */
  scheduledDepartureTimes?: string[];
  /** 駅での待機時間（分）- 自動計算または手入力 */
  waitingTime?: number;
  distance?: number; // メートル
  /** 路線名や行き先などのメモ */
  transitMemo?: string;
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
  transports: Transport;
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
  nearestStation?: NearestStation; // 最寄駅
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

export type TravelPlanType = {
  date: string;
  memo?: string;
  spots: Spot[];
  departure: DepartureAndDestinationType;
  destination: DepartureAndDestinationType;
};

export type PlanErrorType = 'spots' | 'departure' | 'destination' | 'transportationMethod' | 'genreId' | 'memo';

export type PlaceTypeGroupKey = keyof typeof placeTypeMap;

export type OpeningHoursType = z.infer<typeof OpeningHoursSchema>;

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
