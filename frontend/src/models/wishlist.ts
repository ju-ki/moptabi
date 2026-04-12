/**
 * 行きたいリスト型定義 — shared-types/wishlist ドメインの re-export
 */
import type { SpotWithWishlistType } from '@shared/wishlist/types';

export {
  WishlistSchema,
  WishlistListResponseSchema,
  WishlistCreateSchema,
  WishlistUpdateSchema,
  SpotWithWishlistSchema,
} from '@shared/wishlist/schema';

export type {
  WishlistItemType,
  WishlistListResponseType,
  WishlistCreateType,
  WishlistUpdateType,
  SpotWithWishlistType,
} from '@shared/wishlist/types';

// frontend 専用: visited API の拡張レスポンス型
export type VisitedSpotWithWishlistType = SpotWithWishlistType & {
  visitCount?: number;
  planDate?: string;
};
