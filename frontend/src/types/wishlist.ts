import type { WishlistItemType } from '@shared/wishlist/types';

export type WishlistType = WishlistItemType;

export type ViewModeType = 'list' | 'map' | 'split';

export type FilteredWishlistType = 'all' | 'visited' | 'unvisited';

export type SortWishlistType = 'priority' | 'rating' | 'createdAt' | 'distance';
