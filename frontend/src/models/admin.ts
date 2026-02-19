import z from 'zod';

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
