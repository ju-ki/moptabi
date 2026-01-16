import { z } from '@hono/zod-openapi';

import { PaginationInfoSchema, PaginationQuerySchema, SortOrderSchema } from './pagination';

/**
 * お知らせの種類
 */
export const NotificationTypeSchema = z.enum(['SYSTEM', 'INFO']).openapi({
  description: 'お知らせの種類',
  example: 'SYSTEM',
});

/**
 * お知らせスキーマ（ユーザー向けレスポンス）
 * - 既読状態を含む
 */
export const NotificationSchema = z
  .object({
    id: z.number().openapi({ description: 'お知らせID', example: 1 }),
    title: z.string().openapi({ description: 'タイトル', example: '新機能リリースのお知らせ' }),
    content: z.string().openapi({ description: '本文', example: '新しい機能が追加されました。' }),
    type: NotificationTypeSchema,
    publishedAt: z.string().datetime(),
    readAt: z.string().datetime().nullable().openapi({ description: '既読日時（ISO8601形式）', example: null }),
    createdAt: z
      .string()
      .datetime()
      .openapi({ description: '作成日時（ISO8601形式）', example: '2025-01-01T00:00:00.000Z' }),
    isRead: z.boolean().openapi({ description: '既読フラグ', example: false }),
  })
  .openapi('Notification');

/**
 * お知らせ一覧レスポンススキーマ
 */
export const NotificationListResponseSchema = z.array(NotificationSchema).openapi('NotificationListResponse');

/**
 * 未読件数レスポンススキーマ
 */
export const UnreadCountResponseSchema = z
  .object({
    count: z.number().openapi({ description: '未読件数', example: 3 }),
  })
  .openapi('UnreadCountResponse');

/**
 * 既読更新レスポンススキーマ
 */
export const MarkReadResponseSchema = z
  .object({
    success: z.boolean().openapi({ description: '成功フラグ', example: true }),
  })
  .openapi('MarkReadResponse');

/**
 * 全既読更新レスポンススキーマ
 */
export const MarkAllReadResponseSchema = z
  .object({
    success: z.boolean().openapi({ description: '成功フラグ', example: true }),
    count: z.number().openapi({ description: '更新件数', example: 5 }),
  })
  .openapi('MarkAllReadResponse');

/**
 * お知らせ作成リクエストスキーマ
 */
export const NotificationCreateSchema = z
  .object({
    title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内です').openapi({
      description: 'タイトル',
      example: '新機能リリースのお知らせ',
    }),
    content: z.string().min(1, '内容は必須です').openapi({
      description: '本文',
      example: '新しい機能が追加されました。',
    }),
    type: NotificationTypeSchema,
    publishedAt: z.iso.date().openapi({
      description: '公開日時（ISO8601形式）',
      example: '2025-01-15T09:00:00.000Z',
    }),
  })
  .openapi('NotificationCreate');

/**
 * お知らせ更新リクエストスキーマ
 */
export const NotificationUpdateSchema = z
  .object({
    title: z.string().min(1).max(100).openapi({
      description: 'タイトル',
      example: '更新後のタイトル',
    }),
    content: z.string().min(1).openapi({
      description: '本文',
      example: '更新後の内容',
    }),
    type: NotificationTypeSchema,
    publishedAt: z.iso.date().openapi({
      description: '公開日時（ISO8601形式）',
      example: '2025-01-15T09:00:00.000Z',
    }),
  })
  .openapi('NotificationUpdate');

/**
 * お知らせレスポンススキーマ（管理者向け、作成・更新時）
 */
export const NotificationResponseSchema = z
  .object({
    id: z.number().openapi({ description: 'お知らせID', example: 1 }),
    title: z.string().openapi({ description: 'タイトル', example: '新機能リリースのお知らせ' }),
    content: z.string().openapi({ description: '本文', example: '新しい機能が追加されました。' }),
    type: NotificationTypeSchema,
    publishedAt: z.iso.date(),
    createdAt: z.string().datetime(),
  })
  .openapi('NotificationResponse');

/**
 * 管理者向けお知らせスキーマ（既読率情報付き）
 */
export const NotificationAdminSchema = z
  .object({
    id: z.number().openapi({ description: 'お知らせID', example: 1 }),
    title: z.string().openapi({ description: 'タイトル', example: '新機能リリースのお知らせ' }),
    content: z.string().openapi({ description: '本文', example: '新しい機能が追加されました。' }),
    type: NotificationTypeSchema,
    publishedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    readRate: z.number().openapi({ description: '既読率（%）', example: 75 }),
    totalRecipients: z.number().openapi({ description: '配信対象者数', example: 100 }),
    readCount: z.number().openapi({ description: '既読者数', example: 75 }),
  })
  .openapi('NotificationAdmin');

/**
 * 管理者向けお知らせ一覧レスポンススキーマ
 */
export const NotificationAdminListResponseSchema = z
  .array(NotificationAdminSchema)
  .openapi('NotificationAdminListResponse');

/**
 * 管理者向けお知らせソート項目スキーマ
 */
export const NotificationAdminSortBySchema = z
  .enum(['publishedAt', 'createdAt', 'readRate'])
  .default('publishedAt')
  .openapi({
    description: 'ソート項目',
    example: 'publishedAt',
  });

/**
 * 管理者向けお知らせ一覧クエリパラメータスキーマ
 */
export const NotificationAdminQuerySchema = PaginationQuerySchema.extend({
  title: z.string().optional().openapi({
    description: 'タイトル検索（部分一致）',
    example: 'システム',
  }),
  type: z.enum(['SYSTEM', 'INFO']).optional().openapi({
    description: 'お知らせタイプでフィルター',
    example: 'SYSTEM',
  }),
  publishedFrom: z.string().optional().openapi({
    description: '公開日（開始）',
    example: '2025-01-01',
  }),
  publishedTo: z.string().optional().openapi({
    description: '公開日（終了）',
    example: '2025-12-31',
  }),
  sortBy: z.string().optional().pipe(NotificationAdminSortBySchema).openapi({
    description: 'ソート項目',
    example: 'publishedAt',
  }),
  sortOrder: z.string().optional().pipe(SortOrderSchema).openapi({
    description: 'ソート順',
    example: 'desc',
  }),
});

/**
 * 管理者向けお知らせ一覧レスポンススキーマ（ページネーション付き）
 */
export const NotificationAdminPaginatedResponseSchema = z
  .object({
    notifications: z.array(NotificationAdminSchema),
    pagination: PaginationInfoSchema,
  })
  .openapi('NotificationAdminPaginatedResponse');

// 型エクスポート
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>;
export type MarkAllReadResponse = z.infer<typeof MarkAllReadResponseSchema>;
export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;
export type NotificationUpdate = z.infer<typeof NotificationUpdateSchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationAdmin = z.infer<typeof NotificationAdminSchema>;
export type NotificationAdminListResponse = z.infer<typeof NotificationAdminListResponseSchema>;
export type NotificationAdminSortBy = z.infer<typeof NotificationAdminSortBySchema>;
export type NotificationAdminQuery = z.infer<typeof NotificationAdminQuerySchema>;
export type NotificationAdminPaginatedResponse = z.infer<typeof NotificationAdminPaginatedResponseSchema>;
