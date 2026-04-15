import { z } from 'zod';

import {
  SpotWithWishlistSchema,
  UnvisitedSpotsResponseSchema,
  VisitedSpotsResponseSchema,
  WishlistCreateSchema,
  WishlistListResponseSchema,
  WishlistSchema,
  WishlistUpdateSchema,
} from './schema';

export type WishlistItemType = z.infer<typeof WishlistSchema>;
export type WishlistListResponseType = z.infer<typeof WishlistListResponseSchema>;
export type WishlistCreateType = z.infer<typeof WishlistCreateSchema>;
export type WishlistUpdateType = z.infer<typeof WishlistUpdateSchema>;
export type SpotWithWishlistType = z.infer<typeof SpotWithWishlistSchema>;
export type UnvisitedSpotsResponseType = z.infer<typeof UnvisitedSpotsResponseSchema>;
export type VisitedSpotsResponseType = z.infer<typeof VisitedSpotsResponseSchema>;
