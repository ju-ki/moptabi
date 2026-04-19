import { z } from 'zod';

import { SpotSchema, SpotWithMetaSchema } from '../spot/schema';

// 行きたいリスト単体スキーマ
export const WishlistSchema = z.object({
  id: z.number().optional(),
  spotId: z.string(),
  userId: z.string().optional(),
  memo: z.string().nullable(),
  priority: z.number().min(1).max(5),
  visited: z.number(),
  visitedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  spot: SpotSchema,
});

// 行きたいリスト一覧スキーマ
export const WishlistListResponseSchema = z.array(WishlistSchema);

// 行きたいリスト作成スキーマ
export const WishlistCreateSchema = z.object({
  spotId: z.string(),
  spot: SpotSchema,
  memo: z.string().nullable(),
  priority: z.number().min(1).max(5),
  visited: z.number(),
  visitedAt: z.string().datetime().nullable(),
});

// 行きたいリスト更新スキーマ
export const WishlistUpdateSchema = z.object({
  id: z.number(),
  memo: z.string().nullable(),
  priority: z.number().min(1).max(5),
  visited: z.number(),
  visitedAt: z.string().datetime().nullable(),
});

// ウィッシュリスト形式の拡張スポットスキーマ（行きたいリスト + スポットメタ）
export const SpotWithWishlistSchema = z.object({
  id: z.number(),
  spotId: z.string(),
  userId: z.string(),
  memo: z.string().nullable(),
  priority: z.number().min(1).max(5),
  visited: z.number(),
  visitedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  spot: SpotWithMetaSchema,
});

// 未訪問スポット一覧レスポンススキーマ
export const UnvisitedSpotsResponseSchema = z.array(SpotWithWishlistSchema);

// 訪問済みスポット一覧レスポンススキーマ
export const VisitedSpotsResponseSchema = z.array(SpotWithWishlistSchema);
