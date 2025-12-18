import useSWR from 'swr';

import { useFetcher } from '@/hooks/use-fetcher';
import { Spot, TransportNodeType } from '@/types/plan';

type VisitedSpotResponse = {
  id: number;
  spotId: string;
  userId: string;
  memo: string | null;
  priority: number;
  visited: number;
  visitedAt: string | null;
  visitCount?: number;
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
  // 計画から取得した場合に含まれる可能性のある情報
  plan?: {
    date: string;
    trip: {
      title: string;
    };
  };
};

/**
 * 訪問済みスポットのフィルター・ソートオプション
 */
export type VisitedSpotsQueryOptions = {
  /** 都道府県でフィルタリング */
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
 * Fetches visited spots (including spots that were part of past plans) using optional filters and sorting.
 *
 * @param options - Query options to filter and sort results (prefecture, date range, minimum visit count, sort field, and sort order)
 * @returns An object containing:
 *  - `spots`: the list of spots transformed from the backend response,
 *  - `isLoading`: `true` while the request is in flight, `false` otherwise,
 *  - `error`: any error returned by the fetcher,
 *  - `refresh`: a function to revalidate and reload the data
 */
export function useVisitedSpots(options?: VisitedSpotsQueryOptions) {
  const { getFetcher } = useFetcher();

  // クエリパラメータを構築
  const buildQueryString = () => {
    if (!options) return '';
    const params = new URLSearchParams();
    if (options.prefecture) params.append('prefecture', options.prefecture);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    if (options.minVisitCount !== undefined) params.append('minVisitCount', String(options.minVisitCount));
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/visited${buildQueryString()}`;

  const { data, error, isLoading, mutate } = useSWR<VisitedSpotResponse[]>(endpoint, getFetcher, {
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
    regularOpeningHours: item.spot.meta.openingHours ? item.spot.meta.openingHours : undefined,
    // 訪問・計画情報
    visitedAt: item.visitedAt ?? undefined,
    visitCount: item.visitCount ?? undefined,
    planDate: item.plan?.date,
    planTitle: item.plan?.trip.title,
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