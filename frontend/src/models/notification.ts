import { z } from 'zod';

const NotificationTypeSchema = z.enum(['SYSTEM', 'INFO']);

const NotificationAdminSchema = z.object({
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

/**
 * お知らせ作成リクエストスキーマ
 */
const NotificationCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内です'),
  content: z.string().min(1, '内容は必須です'),
  type: NotificationTypeSchema,
  publishedAt: z.string().date(),
});

/**
 * お知らせ更新リクエストスキーマ
 */
const NotificationUpdateSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内です'),
  content: z.string().min(1, '内容は必須です'),
  type: NotificationTypeSchema,
  publishedAt: z.string().date(),
});

/**
 * お知らせレスポンススキーマ（管理者向け、作成・更新時）
 */
const NotificationResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  type: NotificationTypeSchema,
  publishedAt: z.string().date(),
  createdAt: z.string().date(),
});

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationAdminType = z.infer<typeof NotificationAdminSchema>;
export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;
export type NotificationUpdate = z.infer<typeof NotificationUpdateSchema>;
