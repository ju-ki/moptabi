import { z } from '@hono/zod-openapi';

import type { PlanLocationCandidateItemType, PlanLocationCandidateResponseType } from '@shared/user/types';

// 地点の種別
export const LocationTypeEnum = z.enum(['DEPARTURE', 'DESTINATION', 'SPOT']);
export type LocationType = z.infer<typeof LocationTypeEnum>;

export const LOCATION_TYPE = {
  DEPARTURE: 'DEPARTURE',
  DESTINATION: 'DESTINATION',
} as const;

// プラン作成時の出発地・目的地履歴スキーマ（レスポンス用）
export const PlanLocationSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  userId: z.string().openapi({ example: 'user_001' }),
  name: z.string().openapi({ example: '2025-01-15_出発地' }),
  latitude: z.number().min(-90).max(90).openapi({ example: 35.6895 }),
  longitude: z.number().min(-180).max(180).openapi({ example: 139.6917 }),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .openapi({ example: '09:00' }),
  locationType: LocationTypeEnum.openapi({ example: 'DEPARTURE' }),
  planId: z.number().nullable().openapi({ example: 1 }),
  createdAt: z.string().datetime().openapi({ example: '2025-10-15T12:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-10-15T12:00:00Z' }),
});

// プラン作成時の出発地・目的地履歴一覧スキーマ
export const PlanLocationListSchema = z.array(PlanLocationSchema);

// 作成時のスキーマ（プラン作成時の登録用）
export const CreatePlanLocationSchema = z.object({
  name: z
    .string()
    .max(100, { message: '地点名は100文字以内で入力してください' })
    .optional()
    .openapi({ example: '2025-01-15_出発地' }),
  latitude: z
    .number()
    .min(-90, { message: '緯度は-90から90の範囲で入力してください' })
    .max(90, { message: '緯度は-90から90の範囲で入力してください' })
    .openapi({ example: 35.6895 }),
  longitude: z
    .number()
    .min(-180, { message: '経度は-180から180の範囲で入力してください' })
    .max(180, { message: '経度は-180から180の範囲で入力してください' })
    .openapi({ example: 139.6917 }),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '時刻はHH:MM形式で入力してください' })
    .optional()
    .openapi({ example: '09:00' }),
  locationType: LocationTypeEnum.openapi({ example: 'DEPARTURE' }),
  planId: z.number().openapi({ example: 1 }),
  userLocationId: z
    .number()
    .nullable()
    .optional()
    .openapi({ example: 1, description: 'UserLocationが設定された場合に使用回数を更新するためのID' }),
  planLocationId: z
    .number()
    .nullable()
    .optional()
    .openapi({ example: 1, description: '既存のPlanLocationが設定された場合に使用回数を更新するためのID' }),
});

// IDパラメータスキーマ
export const PlanLocationIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'IDは数値である必要があります' }).openapi({ example: '1' }),
});

// 候補取得用のクエリパラメータスキーマ
// FR-3: 候補の一覧の表示順序はお気に入り(使用回数→id)→過去に設定した地点で使用回数が多い(次点id)
export const PlanLocationCandidateQuerySchema = z.object({
  locationType: LocationTypeEnum.optional().openapi({ example: 'DEPARTURE' }),
  search: z.string().optional().openapi({ example: '東京' }),
  limit: z.coerce.number().min(1).max(50).optional().default(10).openapi({ example: 10 }),
});

// 候補レスポンススキーマ（お気に入りと履歴を分けて返す）
export const PlanLocationCandidateResponseSchema = z.object({
  favorites: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        label: z.string().nullable(),
        isDefault: z.boolean(),
        locationType: LocationTypeEnum,
        usageCount: z.number().nullable(),
        planId: z.number().nullable(),
        planName: z.string().nullable(),
        userLocationId: z.number().nullable(),
        planLocationId: z.number().nullable(),
      }),
    )
    .openapi({ description: 'お気に入り地点（UserLocationから）' }),
  history: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        label: z.string().nullable(),
        isDefault: z.boolean(),
        locationType: LocationTypeEnum,
        usageCount: z.number().nullable(),
        planId: z.number().nullable(),
        planName: z.string().nullable(),
        userLocationId: z.number().nullable(),
        planLocationId: z.number().nullable(),
      }),
    )
    .openapi({ description: '過去に設定した地点（PlanLocationから）' }),
});

export type CreatePlanLocationType = z.infer<typeof CreatePlanLocationSchema>;

// コントラクト型エイリアス（shared-types との契約）
export type { PlanLocationCandidateItemType, PlanLocationCandidateResponseType };
