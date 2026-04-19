/**
 * プラン作成時の出発地・目的地履歴の型定義
 */
import { PlanLocationCandidateItemSchema, PlanLocationCandidateResponseSchema } from '@shared/user/schema';

import type { PlanLocationCandidateItemType, PlanLocationCandidateResponseType } from '@shared/user/types';

// 地点タイプ
export const LOCATION_TYPE = {
  DEPARTURE: 'DEPARTURE',
  DESTINATION: 'DESTINATION',
} as const;

export { PlanLocationCandidateItemSchema as DepartureAndDestinationSchema };
export { PlanLocationCandidateResponseSchema };

export type DepartureAndDestinationType = PlanLocationCandidateItemType;
export type { PlanLocationCandidateResponseType as PlanLocationCandidatesResponse };

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
