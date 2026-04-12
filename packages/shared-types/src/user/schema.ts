import { z } from 'zod';

import { LocationTypeSchema, TransportSchema } from '../trip/schema';

// ユーザーお気に入り地点スキーマ（レスポンス用）
export const UserLocationSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().nullable(),
  label: z.string().nullable(),
  usageCount: z.number(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// 作成リクエストスキーマ
export const CreateUserLocationSchema = z.object({
  name: z
    .string()
    .min(1, { message: '地点名は必須です' })
    .max(255, { message: '地点名は255文字以内で入力してください' }),
  latitude: z
    .number()
    .min(-90, { message: '緯度は-90から90の範囲で入力してください' })
    .max(90, { message: '緯度は-90から90の範囲で入力してください' }),
  longitude: z
    .number()
    .min(-180, { message: '経度は-180から180の範囲で入力してください' })
    .max(180, { message: '経度は-180から180の範囲で入力してください' }),
  address: z.string().max(255).nullable().optional(),
  label: z.string().max(255).nullable().optional(),
  isDefault: z.boolean().optional().default(false),
});

// 更新リクエストスキーマ
export const UpdateUserLocationSchema = z.object({
  name: z
    .string()
    .min(1, { message: '地点名は必須です' })
    .max(255, { message: '地点名は255文字以内で入力してください' })
    .optional(),
  latitude: z
    .number()
    .min(-90, { message: '緯度は-90から90の範囲で入力してください' })
    .max(90, { message: '緯度は-90から90の範囲で入力してください' })
    .optional(),
  longitude: z
    .number()
    .min(-180, { message: '経度は-180から180の範囲で入力してください' })
    .max(180, { message: '経度は-180から180の範囲で入力してください' })
    .optional(),
  address: z.string().max(255).nullable().optional(),
  label: z.string().max(255).nullable().optional(),
  isDefault: z.boolean().optional(),
});

// 候補アイテムスキーマ（お気に入り/履歴の両方で使用）
export const PlanLocationCandidateItemSchema = z.object({
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().nullable(),
  label: z.string().nullable(),
  isDefault: z.boolean(),
  locationType: LocationTypeSchema,
  usageCount: z.number().nullable(),
  planId: z.number().nullable(),
  planName: z.string().nullable(),
  userLocationId: z.number().nullable(),
  planLocationId: z.number().nullable(),
  transports: TransportSchema.optional(),
});

// 候補取得APIレスポンススキーマ
export const PlanLocationCandidateResponseSchema = z.object({
  favorites: z.array(PlanLocationCandidateItemSchema),
  history: z.array(PlanLocationCandidateItemSchema),
});
