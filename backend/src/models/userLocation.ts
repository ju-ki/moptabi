import { z } from '@hono/zod-openapi';

import type { CreateUserLocationType, UpdateUserLocationType, UserLocationType } from '@shared/user/types';

// 定数: マイページでのお気に入り登録は最大5件
export const MAX_USER_LOCATIONS = 5;

// ユーザーのお気に入り地点のスキーマ（レスポンス用）
export const UserLocationSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  userId: z.string().openapi({ example: 'user_001' }),
  name: z.string().nullable().openapi({ example: '自宅' }),
  latitude: z.number().min(-90).max(90).openapi({ example: 35.6895 }),
  longitude: z.number().min(-180).max(180).openapi({ example: 139.6917 }),
  address: z.string().nullable().openapi({ example: '東京都千代田区千代田1-1' }),
  label: z.string().nullable().openapi({ example: '自宅' }),
  usageCount: z.number().min(0).openapi({ example: 5 }),
  isDefault: z.boolean().openapi({ example: false }),
  createdAt: z.coerce.date().openapi({ example: '2025-10-15T12:00:00Z' }),
  updatedAt: z.coerce.date().openapi({ example: '2025-10-15T12:00:00Z' }),
});

// ユーザーのお気に入り地点の一覧スキーマ
export const UserLocationListSchema = z.array(UserLocationSchema);

// 作成時のスキーマ（マイページからのお気に入り登録用）
export const CreateUserLocationSchema = z.object({
  name: z
    .string()
    .min(1, { message: '地点名は必須です' })
    .max(255, { message: '地点名は255文字以内で入力してください' })
    .openapi({ example: '自宅' }),
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
  address: z.string().max(255).nullable().optional().openapi({ example: '東京都千代田区千代田1-1' }),
  label: z.string().max(255).nullable().optional().openapi({ example: '自宅' }),
  isDefault: z.boolean().optional().default(false).openapi({ example: false }),
});

// 更新時のスキーマ（ボディ用 - idはパスパラメータから取得）
export const UpdateUserLocationSchema = z.object({
  name: z
    .string()
    .min(1, { message: '地点名は必須です' })
    .max(255, { message: '地点名は255文字以内で入力してください' })
    .optional()
    .openapi({ example: '自宅' }),
  latitude: z
    .number()
    .min(-90, { message: '緯度は-90から90の範囲で入力してください' })
    .max(90, { message: '緯度は-90から90の範囲で入力してください' })
    .optional()
    .openapi({ example: 35.6895 }),
  longitude: z
    .number()
    .min(-180, { message: '経度は-180から180の範囲で入力してください' })
    .max(180, { message: '経度は-180から180の範囲で入力してください' })
    .optional()
    .openapi({ example: 139.6917 }),
  address: z.string().max(255).nullable().optional().openapi({ example: '東京都千代田区千代田1-1' }),
  label: z.string().max(255).nullable().optional().openapi({ example: '自宅' }),
  isDefault: z.boolean().optional().openapi({ example: false }),
});

// 削除時のスキーマ（パスパラメータ用）
export const DeleteUserLocationParamSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'IDは数値である必要があります' }).openapi({ example: '1' }),
});

// IDパラメータスキーマ（単一取得用）
export const UserLocationIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'IDは数値である必要があります' }).openapi({ example: '1' }),
});

// コントラクト型エイリアス（shared-types との契約）
export type { UserLocationType, CreateUserLocationType, UpdateUserLocationType };
