import { z } from 'zod';

import {
  NotificationFilterSchema,
  NotificationSortBySchema,
  NotificationTypeSchema,
  RoleTypeSchema,
  UserSortBySchema,
} from './schema';
import { SortOrder } from '../common/types';

export type RoleType = z.infer<typeof RoleTypeSchema>;
export type { SortOrder };
export type UserSortBy = z.infer<typeof UserSortBySchema>;
export type NotificationSortBy = z.infer<typeof NotificationSortBySchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;
