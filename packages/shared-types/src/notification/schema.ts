import { z } from 'zod';

import { NotificationTypeSchema } from '../admin/schema';

// NotificationTypeSchema は admin/schema で定義済みのため re-export
export { NotificationTypeSchema };

// ユーザー向けお知らせスキーマ（既読状態付き）
export const NotificationSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  type: NotificationTypeSchema,
  publishedAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  isRead: z.boolean(),
});

// お知らせ一覧レスポンススキーマ
export const NotificationListResponseSchema = z.array(NotificationSchema);

// 未読件数レスポンススキーマ
export const UnreadCountResponseSchema = z.object({
  count: z.number(),
});

// 既読更新レスポンススキーマ
export const MarkReadResponseSchema = z.object({
  success: z.boolean(),
});

// 全既読更新レスポンススキーマ
export const MarkAllReadResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
});

// お知らせ作成リクエストスキーマ
export const NotificationCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内です'),
  content: z.string().min(1, '内容は必須です'),
  type: NotificationTypeSchema,
  publishedAt: z.string().date(),
});

// お知らせ更新リクエストスキーマ
export const NotificationUpdateSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内です'),
  content: z.string().min(1, '内容は必須です'),
  type: NotificationTypeSchema,
  publishedAt: z.string().date(),
});

// お知らせレスポンススキーマ（管理者向け、作成・更新時）
export const NotificationResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  type: NotificationTypeSchema,
  publishedAt: z.string().date(),
  createdAt: z.string().date(),
});

// 管理者向けお知らせスキーマ（既読率情報付き）
export const NotificationAdminSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  type: NotificationTypeSchema,
  publishedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  readRate: z.number(),
  totalRecipients: z.number(),
  readCount: z.number(),
});

// 管理者向けお知らせ一覧レスポンススキーマ
export const NotificationAdminListResponseSchema = z.array(NotificationAdminSchema);
