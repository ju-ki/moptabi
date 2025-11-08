import { z } from 'zod';

import { SpotSchema } from './spot';

export const WishlistSchema = z.object({
  id: z.number().optional(),
  spotId: z.string(),
  memo: z.string().nullable(),
  priority: z.number().min(1).max(5),
  visited: z.number(),
  visitedAt: z.string().datetime().nullable(),
  spot: SpotSchema,
});

export const WishlistListResponseSchema = z.array(WishlistSchema);
