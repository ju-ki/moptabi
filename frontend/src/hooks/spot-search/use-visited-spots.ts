import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';

import { useFetcher } from '@/hooks/use-fetcher';
import { Spot, TransportNodeType } from '@/types/plan';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation } from '@/data/constants';
import { VisitedSpotWithWishlistType } from '@/models/wishlist';

type VisitedSpotResponse = VisitedSpotWithWishlistType;

/**
 * 訪問済みスポットのフィルター・ソートオプション
 */
export type VisitedSpotsQueryOptions = {
  /** 都道府県でフィルタリング（フロントエンド側で実施） */
  prefecture?: string;
  /** 期間フィルター（開始日）YYYY-MM-DD形式 */
  dateFrom?: string;
  /** 期間フィルター（終了日）YYYY-MM-DD形式 */
  dateTo?: string;
  /** 最小訪問回数（指定した回数以上訪問・計画したスポットのみ） */
  minVisitCount?: number;
  /** ソート項目（visitedAt: 訪問日順, createdAt: 追加日順, planDate: 計画日順, visitCount: 訪問回数順） */
  sortBy?: 'visitedAt' | 'createdAt' | 'planDate' | 'visitCount';
  /** ソート方向（asc: 昇順, desc: 降順） */
  sortOrder?: 'asc' | 'desc';
};

/**
 * 訪問済み＋過去の計画に含まれたスポットを取得するカスタムフック
 * @param options フィルター・ソートオプション
 */
export function useVisitedSpots(options?: VisitedSpotsQueryOptions) {
  const { getFetcher } = useFetcher();
  const [enrichedItems, setEnrichedItems] = useState<Spot[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  // クエリパラメータを構築（prefectureはフロントエンド側でフィルタリングするため送らない）
  const buildQueryString = () => {
    if (!options) return '';
    const params = new URLSearchParams();
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    if (options.minVisitCount !== undefined) params.append('minVisitCount', String(options.minVisitCount));
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/visited${buildQueryString()}`;

  const {
    data: rawData,
    error,
    isLoading,
    mutate,
  } = useSWR<VisitedSpotResponse[]>(endpoint, getFetcher, {
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
          visitedAt: item.visitedAt ?? undefined,
          visitCount: item.visitCount ?? undefined,
          planDate: item.planDate,
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
