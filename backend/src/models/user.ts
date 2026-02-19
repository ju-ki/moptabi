import { z } from '@hono/zod-openapi';

import { PaginationInfoSchema, PaginationQuerySchema, SortOrderSchema } from './pagination';

/**
 * ユーザーロールスキーマ
 */
export const UserRoleSchema = z.enum(['ADMIN', 'USER', 'GUEST']).openapi({
  description: 'ユーザーロール',
  example: 'USER',
});

/**
 * ユーザー情報スキーマ（管理者向け）
 */
export const UserSchema = z
  .object({
    id: z.string().openapi({ description: 'ユーザーID', example: 'user_12345' }),
    firstName: z.string().nullable().openapi({ description: '名前', example: '太郎' }),
    lastName: z.string().nullable().openapi({ description: '姓', example: '山田' }),
    email: z
      .object({
        emailAddress: z.string().email(),
      })
      .nullable()
      .openapi({ description: 'メールアドレス情報' }),
    imageUrl: z.string().nullable().openapi({ description: 'プロフィール画像URL' }),
    registeredAt: z.number().openapi({ description: '登録日時（UNIXタイムスタンプ）', example: 1704067200000 }),
    lastLoginAt: z
      .number()
      .nullable()
      .openapi({ description: '最終ログイン日時（UNIXタイムスタンプ）', example: 1704153600000 }),
    role: UserRoleSchema,
    wishlistCount: z.number().int().nonnegative().openapi({ description: '行きたいリスト数', example: 5 }),
    planCount: z.number().int().nonnegative().openapi({ description: 'プラン数', example: 3 }),
  })
  .openapi('User');

/**
 * ユーザーリストソート項目スキーマ
 */
export const UserSortBySchema = z
  .enum(['lastLoginAt', 'registeredAt', 'planCount', 'wishlistCount'])
  .default('lastLoginAt')
  .openapi({
    description: 'ソート項目',
    example: 'lastLoginAt',
  });

/**
 * ユーザーリストクエリパラメータスキーマ
 */
export const UserListQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().openapi({
    description: '検索キーワード（名前、メール、IDで検索）',
    example: '山田',
  }),
  sortBy: z.string().optional().pipe(UserSortBySchema).openapi({
    description: 'ソート項目',
    example: 'lastLoginAt',
  }),
  sortOrder: z.string().optional().pipe(SortOrderSchema).openapi({
    description: 'ソート順',
    example: 'desc',
  }),
});

/**
 * ユーザーリストレスポンススキーマ
 */
export const UserListResponseSchema = z
  .object({
    users: z.array(UserSchema),
    pagination: PaginationInfoSchema,
  })
  .openapi('UserListResponse');

// 型エクスポート
export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserSortBy = z.infer<typeof UserSortBySchema>;
export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
