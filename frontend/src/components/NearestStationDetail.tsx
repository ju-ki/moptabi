'use client';

import { useEffect, useMemo, useState } from 'react';

import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import type { StationType } from '@/types/nearestStation';

type NearestStationDisplay = {
  placeId?: string;
  name?: string;
  stationType?: StationType;
  walkingTime?: number;
  transitTime?: number;
  scheduledDepartureTime?: string;
  transitMemo?: string;
};

interface NearestStationDetailProps {
  nearestStation: NearestStationDisplay;
  className?: string;
  showDepartureTime?: boolean;
  showTransitMemo?: boolean;
}

function getStationTypeIcon(stationType?: StationType): string {
  if (stationType === 'BUS') return '🚌';
  if (stationType === 'TRAIN') return '🚃';
  return '?';
}

export function NearestStationDetail({
  nearestStation,
  className,
  showDepartureTime = true,
  showTransitMemo = true,
}: NearestStationDetailProps) {
  const [resolvedStationName, setResolvedStationName] = useState(nearestStation.name ?? '');
  const [hasFetchError, setHasFetchError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolveStationName() {
      const hasName = Boolean(nearestStation.name?.trim()) && nearestStation.name !== '最寄駅';
      if (!nearestStation.placeId || hasName) {
        setResolvedStationName(nearestStation.name ?? '');
        setHasFetchError(false);
        return;
      }

      const result = await fetchPlaceDetailsWithRetry(nearestStation.placeId);
      if (!isMounted) return;

      if (result.hasError || !result.data?.name) {
        setHasFetchError(true);
        setResolvedStationName(nearestStation.name ?? '');
        return;
      }

      setHasFetchError(false);
      setResolvedStationName(result.data.name);
    }

    resolveStationName();

    return () => {
      isMounted = false;
    };
  }, [nearestStation.placeId, nearestStation.name]);

  const stationName = useMemo(() => {
    const name = resolvedStationName?.trim();
    return name && name.length > 0 ? name : '駅名未取得';
  }, [resolvedStationName]);

  const departureTime = nearestStation.scheduledDepartureTime?.trim() || '--:--';
  const hasTransitMemo = Boolean(nearestStation.transitMemo?.trim());
  const containerClassName = className ? `space-y-1 ${className}` : 'space-y-1';

  return (
    <div className={containerClassName} data-testid="nearest-station-detail">
      <p className="text-[11px] font-semibold tracking-wide text-gray-500">最寄り駅情報</p>

      <div className="flex items-start gap-2 rounded-md border border-gray-100 bg-white px-2 py-1.5 text-sm text-gray-700">
        <span
          className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100"
          data-testid="nearest-station-type-icon"
        >
          {getStationTypeIcon(nearestStation.stationType)}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">駅名</p>
          <p className="break-words font-medium leading-5">{stationName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-2">
        <span
          className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1"
          data-testid="nearest-station-walking-time"
        >
          <span className="font-medium text-gray-700">徒歩{nearestStation.walkingTime ?? '-'}分</span>
        </span>
        {showDepartureTime && (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1"
            data-testid="nearest-station-departure-time"
          >
            <span className="font-medium text-gray-700">発車 {departureTime}</span>
          </span>
        )}
        {showDepartureTime && (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1"
            data-testid="nearest-station-transit-time"
          >
            <span className="font-medium text-gray-700">乗車 {nearestStation.transitTime ?? '-'}分</span>
          </span>
        )}
      </div>

      {showTransitMemo && hasTransitMemo && (
        <div className="rounded-md bg-gray-50 px-2 py-1.5">
          <p className="text-[11px] text-gray-500">メモ</p>
          <p className="line-clamp-2 whitespace-pre-wrap text-xs text-gray-600" data-testid="nearest-station-memo">
            {nearestStation.transitMemo}
          </p>
        </div>
      )}
      {hasFetchError && (
        <p className="text-xs text-amber-600" data-testid="nearest-station-fetch-error">
          最寄駅情報を取得できませんでした
        </p>
      )}
    </div>
  );
}
