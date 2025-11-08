import { z } from "@hono/zod-openapi";

import { SpotSchema } from "@/models/spot";

export const WishlistSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  spotId: z.string().openapi({ example: 'spot_abc123' }),
  userId: z.string().openapi({ example: 'user_001' }),
  memo: z.string().nullable().openapi({ example: '夜景が綺麗らしい' }),
  priority: z.number().min(1).max(5).openapi({ example: 3 }),
  visited: z.number().openapi({ example: 0 }),
  visitedAt: z.string().datetime().nullable().openapi({ example: null }),
  createdAt: z.string().datetime().openapi({ example: '2025-10-15T12:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-10-15T12:05:00Z' }),
  spot: SpotSchema,
});

export const WishlistListResponseSchema = z.array(WishlistSchema);

export const WishlistCreateSchema = z.object({
  spotId: z.string().openapi({ example: 'spot_abc123' }),
  spot: SpotSchema,
  memo: z.string().nullable().openapi({ example: '夜景が綺麗らしい' }),
  priority: z.number().min(1).max(5).openapi({ example: 3 }),
  visited: z.number().openapi({ example: 0 }),
  visitedAt: z.string().datetime().nullable().openapi({ example: null }),
});

export const WishlistUpdateSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  memo: z.string().nullable().openapi({ example: '夜景が綺麗らしい' }),
  priority: z.number().min(1).max(5).openapi({ example: 3 }),
  visited: z.number().openapi({ example: 0 }),
  visitedAt: z.string().datetime().nullable().openapi({ example: null }),
  createdAt: z.string().datetime().openapi({ example: '2025-10-15T12:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-10-15T12:05:00Z' }),
});
