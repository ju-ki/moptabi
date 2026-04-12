import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';

import { useFetcher } from '@/hooks/use-fetcher';
import { Spot, TransportNodeType } from '@/types/plan';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation } from '@/data/constants';
import { SpotWithWishlistType } from '@/models/wishlist';

type WishlistSpot = SpotWithWishlistType;

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
 * 未訪問の行きたいリストを取得するカスタムフック
 * @param options フィルター・ソートオプション
 */
export function useWishlistSpots(options?: WishlistSpotsQueryOptions) {
  const { getFetcher } = useFetcher();
  const [enrichedItems, setEnrichedItems] = useState<Spot[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  // クエリパラメータを構築（prefectureはフロントエンド側でフィルタリングするため送らない）
  const buildQueryString = () => {
    if (!options) return '';
    const params = new URLSearchParams();
    if (options.priority !== undefined) params.append('priority', String(options.priority));
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  const baseEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/unvisited`;
  const endpoint = `${baseEndpoint}${buildQueryString()}`;

  const {
    data: rawData,
    error,
    isLoading,
    mutate,
  } = useSWR<WishlistSpot[]>(endpoint, getFetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  // rawData が変わったら Google Maps API でスポット詳細を取得して enrichedItems を更新
  useEffect(() => {
    if (!rawData) {
      setEnrichedItems([]);
      return;
    }
    let cancelled = false;
    setIsEnriching(true);
    Promise.all(
      rawData.map(async (item) => {
        const result = await fetchPlaceDetailsWithRetry(item.spotId);
        const meta = result.data;
        return {
          id: item.spotId,
          location: {
            id: item.spotId,
            name: meta?.name ?? item.spotId,
            lat: meta?.latitude ?? defaultLocation.lat,
            lng: meta?.longitude ?? defaultLocation.lng,
          },
          image: meta?.image,
          url: meta?.url ?? undefined,
          rating: meta?.rating ?? undefined,
          category: meta?.categories,
          description: meta?.description,
          prefecture: meta?.prefecture ?? undefined,
          address: meta?.address,
          catchphrase: meta?.catchphrase ?? undefined,
          regularOpeningHours: meta?.openingHours ?? undefined,
          priority: item.priority,
          memo: item.memo ?? undefined,
          visitedAt: item.visitedAt ?? undefined,
          createdAt: item.createdAt ?? undefined,
          stayStart: '09:00',
          stayEnd: '10:00',
          transports: {
            transportMethod: 0,
            name: 'DEFAULT',
            travelTime: '不明',
            fromType: TransportNodeType.SPOT,
            toType: TransportNodeType.SPOT,
          },
          order: 0,
        } as Spot;
      }),
    )
      .then((enriched) => {
        if (!cancelled) setEnrichedItems(enriched);
      })
      .finally(() => {
        if (!cancelled) setIsEnriching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawData]);

  // クライアント側で都道府県フィルタリング
  const spots = useMemo(
    () => (options?.prefecture ? enrichedItems.filter((s) => s.prefecture === options.prefecture) : enrichedItems),
    [enrichedItems, options?.prefecture],
  );

  return {
    spots,
    isLoading: isLoading || isEnriching,
    error,
    refresh: mutate,
  };
}
