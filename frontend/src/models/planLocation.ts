/**
 * プラン作成時の出発地・目的地履歴の型定義
 */
import z from 'zod';

import { LocationTypeEnum, TransportSchema } from './transport';

// 地点タイプ
export const LOCATION_TYPE = {
  DEPARTURE: 'DEPARTURE',
  DESTINATION: 'DESTINATION',
} as const;

export const DepartureAndDestinationSchema = z.object({
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().nullable(),
  label: z.string().nullable(),
  isDefault: z.boolean(),
  locationType: LocationTypeEnum,
  usageCount: z.number().nullable(),
  userLocationId: z.number().nullable(),
  planLocationId: z.number().nullable(),
  planName: z.string().nullable(),
  transports: TransportSchema.optional(),
});

export type DepartureAndDestinationType = z.infer<typeof DepartureAndDestinationSchema>;

export type LocationType = (typeof LOCATION_TYPE)[keyof typeof LOCATION_TYPE];

// PlanLocation（履歴）
export interface PlanLocation {
  userId: string;
  planId: number | null;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  locationType: LocationType;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// 候補として表示する地点（お気に入り/履歴の両方で使用）
export interface PlanLocationCandidate {
  planLocationId: number | null;
  userLocationId: number | null;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  usageCount: number;
  isFavorite: boolean;
  isDefault?: boolean;
  label?: string | null;
  locationType?: LocationType;
}

// 候補取得APIのレスポンス
export interface PlanLocationCandidatesResponse {
  favorites: DepartureAndDestinationType[];
  history: DepartureAndDestinationType[];
}

// 作成時のリクエスト
export interface CreatePlanLocationRequest {
  name?: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  locationType: LocationType;
  planId?: number | null;
}

// 更新時のリクエスト
export interface UpdatePlanLocationRequest {
  id: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string | null;
  usageCount?: number;
}
