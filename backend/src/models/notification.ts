import { z } from '@hono/zod-openapi';

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

// 型エクスポート
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>;
export type MarkAllReadResponse = z.infer<typeof MarkAllReadResponseSchema>;
