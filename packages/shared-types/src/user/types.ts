import { z } from 'zod';

import {
  CreateUserLocationSchema,
  PlanLocationCandidateItemSchema,
  PlanLocationCandidateResponseSchema,
  UpdateUserLocationSchema,
  UserLocationSchema,
  UserLimitSchema,
} from './schema';

export type UserLocationType = z.infer<typeof UserLocationSchema>;
export type CreateUserLocationType = z.infer<typeof CreateUserLocationSchema>;
export type UpdateUserLocationType = z.infer<typeof UpdateUserLocationSchema>;
export type PlanLocationCandidateItemType = z.infer<typeof PlanLocationCandidateItemSchema>;
export type PlanLocationCandidateResponseType = z.infer<typeof PlanLocationCandidateResponseSchema>;

// ラベルの選択肢
export const LOCATION_LABELS = ['自宅', '駅・バス停', '実家', '旅の拠点', 'その他'] as const;
export type LocationLabel = (typeof LOCATION_LABELS)[number];

export type UserLimitType = z.infer<typeof UserLimitSchema>;

export const DEFAULT_USER_LIMITS: UserLimitType = {
  maxWishlistSpots: 20,
  maxPlans: 5,
  maxSpotsPerDay: 5,
  maxPlanDays: 3,
  maxUserLocations: 2,
};

export type LimitType = 'wishlist' | 'plans' | 'spotsPerDay' | 'planDays' | 'userLocations';

export function buildLimitErrorMessage(type: LimitType, limit: number): string {
  switch (type) {
    case 'wishlist':
      return `行きたいリストの登録上限（${limit}件）に達しています`;
    case 'plans':
      return `プランの作成上限（${limit}件）に達しています`;
    case 'spotsPerDay':
      return `1日あたりのスポット登録上限（${limit}件）に達しています`;
    case 'planDays':
      return `プランの日数上限（${limit}日）を超えています`;
    case 'userLocations':
      return `ユーザーのお気に入り地点は最大${limit}件まで登録可能です`;
  }
}
