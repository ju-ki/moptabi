import z from 'zod';

import type { NotificationAdminType } from '@/models/notification';
import type { PaginationInfo } from '@/models/pagination';

import type { RoleType, SortOrder, UserSortBy, NotificationFilter, NotificationSortBy } from '@shared/admin/types';

export type { NotificationFilter, NotificationSortBy, RoleType, SortOrder, UserSortBy };

export const WishlistStatsSchema = z.object({
  totalWishlist: z.number(),
  wishlistIncreaseFromLastMonth: z.number(),
});

export const TripStatsSchema = z.object({
  totalPlans: z.number(),
  planIncreaseFromLastMonth: z.number(),
  averagePlansPerUser: z.number(),
});

export const StatsSchema = z.object({
  totalUsers: z.number(),
  activeUserCountFromLastMonth: z.number(),
  wishlistStats: WishlistStatsSchema,
  tripStats: TripStatsSchema,
});

export type WishlistStatsType = z.infer<typeof WishlistStatsSchema>;
export type TripStatsType = z.infer<typeof TripStatsSchema>;
export type StatsType = z.infer<typeof StatsSchema>;

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: { emailAddress: string };
  imageUrl: string;
  registeredAt: number;
  lastLoginAt: number;
  role: RoleType;
  planCount: number;
  wishlistCount: number;
}

export interface UserListResponse {
  users: AdminUser[];
  pagination: PaginationInfo;
}

export interface UserListQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: UserSortBy;
  sortOrder: SortOrder;
}

export interface NotificationAdminListResponse {
  notifications: NotificationAdminType[];
  pagination: PaginationInfo;
}

export interface NotificationListQuery {
  page: number;
  limit: number;
  title?: string;
  type?: NotificationFilter['type'];
  publishedFrom?: string;
  publishedTo?: string;
  sortBy: NotificationSortBy;
  sortOrder: SortOrder;
}
