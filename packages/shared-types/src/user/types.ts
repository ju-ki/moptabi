import { z } from 'zod';

import {
  CreateUserLocationSchema,
  PlanLocationCandidateItemSchema,
  PlanLocationCandidateResponseSchema,
  UpdateUserLocationSchema,
  UserLocationSchema,
} from './schema';

export type UserLocationType = z.infer<typeof UserLocationSchema>;
export type CreateUserLocationType = z.infer<typeof CreateUserLocationSchema>;
export type UpdateUserLocationType = z.infer<typeof UpdateUserLocationSchema>;
export type PlanLocationCandidateItemType = z.infer<typeof PlanLocationCandidateItemSchema>;
export type PlanLocationCandidateResponseType = z.infer<typeof PlanLocationCandidateResponseSchema>;

// 定数: マイページでのお気に入り登録は最大5件
export const MAX_USER_LOCATIONS = 5;

// ラベルの選択肢
export const LOCATION_LABELS = ['自宅', '駅・バス停', '実家', '旅の拠点', 'その他'] as const;
export type LocationLabel = (typeof LOCATION_LABELS)[number];
