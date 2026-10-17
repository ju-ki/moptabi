import { useCallback, useRef, useState } from 'react';

import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { MAP_SEARCH_MESSAGE } from '@/data/constants';
import { ExtendSpotType } from '@/types/plan';
import { SpotMetaType } from '@/types/spot';

/**
 * Place Details の取得結果を、計画に追加できる ExtendSpotType に変換する（No.341）
 * 滞在時間などは仮の値で、追加時に setStartTimeAutomatically で埋める
 */
export const toExtendSpotFromMeta = (meta: SpotMetaType, placeId: string): ExtendSpotType => ({
  ...meta,
  id: placeId,
  spotId: placeId,
  rating: meta.rating ?? 0,
  stayStart: '09:00',
  stayEnd: '10:00',
  stayDuration: 60,
  transportMethod: 'DEFAULT',
  transportMethodId: 0,
  travelTime: 0,
  order: 0,
});

/**
 * 地図で探すで選択中のスポットを管理する（No.341）
 * - selectPlace: Google の POI を押したとき。Place Details を取得する（メモリキャッシュ・リトライ付き）
 * - selectSpot: アプリ側のピンを押したとき。持っているデータを使い API を呼ばない
 */
export function useMapPoiSelection() {
  const [selectedSpot, setSelectedSpot] = useState<ExtendSpotType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 連続で押したときに、古い取得結果で上書きしないための番号
  const requestIdRef = useRef(0);

  const selectPlace = useCallback(
    async (placeId: string) => {
      // 同じ POI をもう一度押したときは取得しない
      if (selectedSpot?.id === placeId) return;
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);
      const result = await fetchPlaceDetailsWithRetry(placeId);
      if (requestId !== requestIdRef.current) return;
      setIsLoading(false);
      if (result.data) {
        setSelectedSpot(toExtendSpotFromMeta(result.data, placeId));
      } else {
        setSelectedSpot(null);
        setError(MAP_SEARCH_MESSAGE.FETCH_ERROR);
      }
    },
    [selectedSpot?.id],
  );

  const selectSpot = useCallback((spot: ExtendSpotType) => {
    requestIdRef.current++;
    setIsLoading(false);
    setError(null);
    setSelectedSpot(spot);
  }, []);

  const clearSelection = useCallback(() => {
    requestIdRef.current++;
    setIsLoading(false);
    setError(null);
    setSelectedSpot(null);
  }, []);

  return { selectedSpot, isLoading, error, selectPlace, selectSpot, clearSelection };
}
