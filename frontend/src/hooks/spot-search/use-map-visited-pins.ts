import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

import { useFetcher } from '@/hooks/use-fetcher';
import { fetchPlaceDetailsWithRetry, getCachedCoordinates } from '@/lib/place-fetcher';
import { VisitedSpotWithWishlistType } from '@/models/wishlist';
import { ExtendSpotType, MapVisitedPin } from '@/types/plan';

import { toExtendSpotFromMeta } from './use-map-poi-selection';

/** 座標キャッシュがない過去のスポットを、1回に詳細取得する件数 */
export const VISITED_PIN_FETCH_BATCH = 20;

/**
 * 地図で探すの過去のスポットのピン（No.341）
 * useVisitedSpots は全件の詳細を一度に取得するため使わず、次の順でピンを作る
 * 1. /spots/visited で spotId の一覧を取る（Places API なし）
 * 2. 座標キャッシュ（getCachedCoordinates）があるものはそのままピンにする（Places API なし）
 * 3. ないものは VISITED_PIN_FETCH_BATCH 件ずつ詳細を取得し、残りは件数と loadMore で出す
 *
 * @param enabled false のときは一覧も詳細も取得しない（ピンが OFF）
 */
export function useMapVisitedPins(enabled: boolean) {
  const { getFetcher } = useFetcher();
  const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/visited`;
  const { data, isLoading } = useSWR<VisitedSpotWithWishlistType[]>(enabled ? endpoint : null, getFetcher, {
    revalidateOnFocus: false,
  });

  const [fetchLimit, setFetchLimit] = useState(VISITED_PIN_FETCH_BATCH);
  const [details, setDetails] = useState<Record<string, ExtendSpotType | null>>({});

  // 座標キャッシュの有無は一覧を受け取った時点で分ける（取得後にキャッシュされても分け直さない）
  const { cachedPins, uncached } = useMemo(() => {
    const unique = Array.from(new Map((data ?? []).map((item) => [item.spotId, item])).values());
    const cached: MapVisitedPin[] = [];
    const rest: VisitedSpotWithWishlistType[] = [];
    unique.forEach((item) => {
      const coordinates = getCachedCoordinates(item.spotId);
      if (coordinates) {
        cached.push({ spotId: item.spotId, lat: coordinates.lat, lng: coordinates.lng, spot: null });
      } else {
        rest.push(item);
      }
    });
    return { cachedPins: cached, uncached: rest };
  }, [data]);

  const targets = useMemo(() => uncached.slice(0, fetchLimit), [uncached, fetchLimit]);

  // 取得を始めたスポット。取得中に件数を増やしても同じスポットを二重に取得しない
  const requestedRef = useRef(new Set<string>());
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const pending = targets.filter((item) => !requestedRef.current.has(item.spotId));
    if (pending.length === 0) return;
    pending.forEach((item) => requestedRef.current.add(item.spotId));
    Promise.all(
      pending.map(async (item) => {
        const result = await fetchPlaceDetailsWithRetry(item.spotId);
        const spot: ExtendSpotType | null = result.data
          ? {
              ...toExtendSpotFromMeta(result.data, item.spotId),
              visitCount: item.visitCount ?? undefined,
              visitedAt: item.visitedAt ?? undefined,
            }
          : null;
        return [item.spotId, spot] as const;
      }),
    ).then((entries) => {
      if (!isMountedRef.current) return;
      setDetails((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
  }, [targets]);

  const fetchedPins: MapVisitedPin[] = useMemo(
    () =>
      targets.flatMap((item) => {
        const spot = details[item.spotId];
        return spot ? [{ spotId: item.spotId, lat: spot.latitude, lng: spot.longitude, spot }] : [];
      }),
    [targets, details],
  );

  const loadMore = useCallback(() => setFetchLimit((limit) => limit + VISITED_PIN_FETCH_BATCH), []);

  return {
    pins: [...cachedPins, ...fetchedPins],
    /** 座標を取得していない（ピンにできていない）スポットの件数 */
    remainingCount: Math.max(uncached.length - fetchLimit, 0),
    loadMore,
    isLoading: isLoading || targets.some((item) => !(item.spotId in details)),
  };
}
