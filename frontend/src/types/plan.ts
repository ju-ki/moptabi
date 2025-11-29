import { placeTypeMap } from '@/data/constants';
import { OpeningHoursSchema } from '@/models/spot';
import z from 'zod';

export type Location = {
  name: string;
  latitude: number;
  longitude: number;
};

export type Coordination = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

export type Transport = {
  transportMethodIds: number[];
  name: TravelModeType; // 例: "電車" | "バス"
  cost?: number;
  travelTime: string; // 例: "30分"
  fromType: TransportNodeType;
  toType: TransportNodeType;
};

export type TransportMethods = {
  id: number;
  name: TravelModeType; // 例: "電車" | "バス"
};

export enum TransportNodeType {
  DEPARTURE = 'DEPARTURE',
  DESTINATION = 'DESTINATION',
  SPOT = 'SPOT',
  ALL = 'ALL',
}

type NearestStation = {
  name: string; // 最寄駅の名前
  walkingTime: number; // 徒歩時間（分）
  latitude: number;
  longitude: number;
};

export type TripInfo = {
  date: string;
  genreId: number;
  transportationMethod: number[];
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
  address?: string;
  ratingCount?: number;
  regularOpeningHours?: OpeningHoursType;
  nearestStation?: NearestStation; // 最寄駅
  order: number;
};

export type TravelPlanType = {
  date: string;
  spots: Spot[];
};

export type PlanErrorType = 'spots' | 'departure' | 'destination' | 'transportationMethod' | 'genreId' | 'memo';

export type ResponseTripType = {
  id: number;
  title: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  tripInfo: ResponseTripInfoType[];
  plans: ResponsePlanType[];
};

export type ResponseTripInfoType = {
  date: string;
  genreId: number;
  transportationMethod: number[];
  memo?: string;
};

export type ResponsePlanType = {
  id: number;
  tripId: number;
  date: string;
  planSpots: ResponsePlanSpotType[];
};

export type ResponsePlanSpotType = {
  id: number;
  plan: ResponsePlanType;
  planId: number;
  spot: ResponseSpotType;
  spotId: string;
  stayStart: string;
  stayEnd: string;
  fromLocation: Transport[];
  toLocation: Transport[];
  memo?: string;
  order: number;
};

export type ResponseSpotType = {
  id: string;
  meta: ResponseSpotMetaType;
  nearestStation: NearestStation;
};

export type ResponseSpotMetaType = {
  id: string;
  spotId: string;
  name: string;
  latitude: number;
  longitude: number;
  image?: string;
  rating: number;
  categories: string[];
  catchphrase?: string;
  description?: string;
};

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

export type Notification = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  isRead: boolean;
};

export type TravelModeType = 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING' | 'DEFAULT';

export type TravelModeTypeForDisplay = Partial<{
  [key in TravelModeType]: {
    icon: React.ReactNode;
    label: string;
  };
}>;
