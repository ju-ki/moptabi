import { z } from 'zod';

import {
  MarkAllReadResponseSchema,
  MarkReadResponseSchema,
  NotificationAdminListResponseSchema,
  NotificationAdminSchema,
  NotificationCreateSchema,
  NotificationListResponseSchema,
  NotificationResponseSchema,
  NotificationSchema,
  NotificationUpdateSchema,
  UnreadCountResponseSchema,
} from './schema';

export type NotificationItemType = z.infer<typeof NotificationSchema>;
export type NotificationListResponseType = z.infer<typeof NotificationListResponseSchema>;
export type UnreadCountResponseType = z.infer<typeof UnreadCountResponseSchema>;
export type MarkReadResponseType = z.infer<typeof MarkReadResponseSchema>;
export type MarkAllReadResponseType = z.infer<typeof MarkAllReadResponseSchema>;
export type NotificationCreateType = z.infer<typeof NotificationCreateSchema>;
export type NotificationUpdateType = z.infer<typeof NotificationUpdateSchema>;
export type NotificationResponseType = z.infer<typeof NotificationResponseSchema>;
export type NotificationAdminType = z.infer<typeof NotificationAdminSchema>;
export type NotificationAdminListResponseType = z.infer<typeof NotificationAdminListResponseSchema>;
