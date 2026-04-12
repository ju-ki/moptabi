import { z } from 'zod';

import { SortOrderSchema } from '../common/schema';

export const RoleTypeSchema = z.enum(['ADMIN', 'USER', 'GUEST']);

export const UserSortBySchema = z.enum(['lastLoginAt', 'registeredAt', 'planCount', 'wishlistCount']);

export const NotificationSortBySchema = z.enum(['publishedAt', 'createdAt', 'readRate']);

export const NotificationTypeSchema = z.enum(['SYSTEM', 'INFO']);

export const NotificationFilterSchema = z.object({
  title: z.string().optional(),
  type: NotificationTypeSchema.or(z.literal('')).optional(),
  publishedFrom: z.string().optional(),
  publishedTo: z.string().optional(),
});

export { SortOrderSchema };
