import { z } from 'zod';

import { WishlistSchema } from '@/models/wishlist';

export type WishlistType = z.infer<typeof WishlistSchema>;

export type ViewModeType = 'list' | 'map' | 'split';

export type FilteredWishlistType = 'all' | 'visited' | 'unvisited';

export type SortWishlistType = 'priority' | 'rating' | 'createdAt' | 'distance';
