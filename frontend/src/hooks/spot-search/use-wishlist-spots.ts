import useSWR from 'swr';

import { useFetcher } from '@/hooks/use-fetcher';
import { Spot, TransportNodeType } from '@/types/plan';

type WishlistSpot = {
  id: number;
  spotId: string;
  userId: string;
  memo: string | null;
  priority: number;
  visited: number;
  visitedAt: string | null;
  createdAt: string | null;
  spot: {
    id: string;
    meta: {
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      categories: string[];
      image: string;
      url: string | null;
      prefecture: string | null;
      address: string;
      rating: number | null;
      catchphrase: string | null;
      openingHours: string | null;
    };
  };
};

/**
 * 未訪問スポットのフィルター・ソートオプション
 */
export type WishlistSpotsQueryOptions = {
  /** 都道府県でフィルタリング */
  prefecture?: string;
  /** 優先度でフィルタリング（1-5） */
  priority?: number;
  /** ソート項目（priority: 優先度順, createdAt: 追加日順） */
  sortBy?: 'priority' | 'createdAt';
  /** ソート方向（asc: 昇順, desc: 降順） */
  sortOrder?: 'asc' | 'desc';
};

/**
 * Fetches unvisited wishlist spots with optional filtering and sorting.
 *
 * @param options - Optional filters and sort settings (prefecture, priority, sortBy, sortOrder)
 * @returns An object containing:
 * - `spots`: an array of `Spot` objects mapped from the backend unvisited wishlist items
 * - `isLoading`: boolean indicating whether the data is being loaded
 * - `error`: any fetch error encountered
 * - `refresh`: function to revalidate and refresh the fetched data
 */
export function useWishlistSpots(options?: WishlistSpotsQueryOptions) {
  const { getFetcher } = useFetcher();

  // クエリパラメータを構築
  const buildQueryString = () => {
    if (!options) return '';
    const params = new URLSearchParams();
    if (options.prefecture) params.append('prefecture', options.prefecture);
    if (options.priority !== undefined) params.append('priority', String(options.priority));
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  const baseEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/unvisited`;

  const endpoint = `${baseEndpoint}${buildQueryString()}`;

  const { data, error, isLoading, mutate } = useSWR<WishlistSpot[]>(endpoint, getFetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  // バックエンドのレスポンスを Spot 型に変換
  const spots: Spot[] = (data ?? []).map((item) => ({
    id: item.spotId,
    location: {
      id: item.spotId,
      name: item.spot.meta.name,
      lat: item.spot.meta.latitude,
      lng: item.spot.meta.longitude,
    },
    image: item.spot.meta.image,
    url: item.spot.meta.url ?? undefined,
    rating: item.spot.meta.rating ?? undefined,
    category: item.spot.meta.categories,
    description: item.spot.meta.description,
    prefecture: item.spot.meta.prefecture ?? undefined,
    address: item.spot.meta.address,
    catchphrase: item.spot.meta.catchphrase ?? undefined,
    regularOpeningHours: item.spot.meta.openingHours ?? null,
    // wishlist 固有のデータ
    priority: item.priority,
    memo: item.memo ?? undefined,
    visitedAt: item.visitedAt ?? undefined,
    createdAt: item.createdAt ?? undefined,
    // デフォルト値
    stayStart: '09:00',
    stayEnd: '10:00',
    transports: {
      transportMethodIds: [0],
      name: 'DEFAULT',
      travelTime: '不明',
      fromType: TransportNodeType.SPOT,
      toType: TransportNodeType.SPOT,
    },
    order: 0,
  }));

  return {
    spots,
    isLoading,
    error,
    refresh: mutate,
  };
}