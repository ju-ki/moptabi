import z from 'zod';

import { placeTypeMap } from '@/data/constants';
import type { CoordinationType } from '@/models/plan';
import { OpeningHoursSchema } from '@/models/spot';
import { DepartureAndDestinationType } from '@/models/planLocation';

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

type NearestStation = {
  name: string; // 最寄駅の名前
  walkingTime: number; // 徒歩時間（分）
  latitude: number;
  longitude: number;
};

export type TripInfo = {
  date: string;
  genreId: number;
  transportationMethod: number;
  memo?: string;
};

export type Spot = {
  id: string;
  location: Coordination;
  stayStart: string;
  stayEnd: string;
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
