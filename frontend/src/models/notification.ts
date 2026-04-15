/**
 * 通知型定義 — shared-types/notification ドメインの再利用
 */
export {
  NotificationTypeSchema,
  NotificationSchema,
  NotificationListResponseSchema,
  UnreadCountResponseSchema,
  MarkReadResponseSchema,
  MarkAllReadResponseSchema,
  NotificationCreateSchema,
  NotificationUpdateSchema,
  NotificationResponseSchema,
  NotificationAdminSchema,
  NotificationAdminListResponseSchema,
} from '@shared/notification/schema';

export type {
  NotificationItemType as NotificationItem,
  NotificationListResponseType,
  UnreadCountResponseType as UnreadCountResponse,
  MarkReadResponseType,
  MarkAllReadResponseType,
  NotificationResponseType,
  NotificationAdminType,
  NotificationCreateType as NotificationCreate,
  NotificationUpdateType as NotificationUpdate,
} from '@shared/notification/types';

export type { NotificationType } from '@shared/admin/types';
