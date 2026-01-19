import z from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  imageUrl: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  wishlistCount: z.number().optional(),
  planCount: z.number().optional(),
  createdAt: z.number().optional(),
  lastLoginAt: z.number().optional(),
});

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
