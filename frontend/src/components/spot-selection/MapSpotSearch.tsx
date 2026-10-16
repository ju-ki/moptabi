'use client';

import { useCallback, useMemo, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

import { useStoreForPlanning } from '@/lib/plan';
import { filterActualSpots } from '@/lib/utils';
import { MAP_FOCUS_ZOOM, MAP_SEARCH_MESSAGE } from '@/data/constants';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { toVisitNumberLabel, useMapCenterCandidates } from '@/hooks/spot-search/use-map-center-candidates';
import { Coordination, ExtendSpotType } from '@/types/plan';

import { MapCenterPicker } from './map/MapCenterPicker';

type MapSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: ExtendSpotType, isDeleted: boolean) => void;
  isLimitReached: boolean;
  limitsError: boolean;
};

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

/**
 * 地図で探す（No.341）
 * 地図上の Google の POI を押して詳細を見て、計画に追加する。自動検索・エリア検索はしない
 */
export function MapSpotSearch({ date }: MapSpotSearchProps) {
  const { plans } = useStoreForPlanning();
  const { mapCenter, mapCenterLabel, setMapCenter } = useSpotSearchStore();
  const { candidates, initialCenter } = useMapCenterCandidates(date);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 中心が未設定（初めて開いた・日付が変わった）ときは初期中心を使う
  const center = mapCenter ?? initialCenter;
  const centerLabel = mapCenter ? mapCenterLabel : initialCenter.label;
  // GoogleMap の center は初回だけ渡し、以降は panTo で動かす（再描画で中心が戻らないように）
  const [initialMapCenter] = useState(() => ({ lat: center.lat, lng: center.lng }));

  const plan = useMemo(() => plans.find((p) => p.date === date), [plans, date]);
  const planSpots = useMemo(() => filterActualSpots(plan?.spots ?? []), [plan]);
  const departure = candidates.find((c) => c.kind === 'departure');
  const destination = candidates.find((c) => c.kind === 'destination');
  const isSameDepartureAndDestination =
    !!departure && !!destination && departure.lat === destination.lat && departure.lng === destination.lng;

  const handleCenterChange = useCallback(
    (next: Coordination, label: string | null) => {
      setMapCenter(next, label);
      map?.panTo({ lat: next.lat, lng: next.lng });
      map?.setZoom(MAP_FOCUS_ZOOM);
    },
    [map, setMapCenter],
  );

  // ドラッグで動かしたら、その中心からの距離を出す（基準名は「中心」）
  const handleDragEnd = () => {
    const next = map?.getCenter();
    if (!next) return;
    setMapCenter(
      { id: 'map-center', name: MAP_SEARCH_MESSAGE.MAP_CENTER_NAME, lat: next.lat(), lng: next.lng() },
      null,
    );
  };

  return (
    <div className="relative flex flex-col gap-3 sm:grid sm:grid-cols-[320px_1fr] sm:gap-4">
      <div className="space-y-4 sm:max-h-[65vh] sm:overflow-y-auto sm:pr-1">
        <MapCenterPicker candidates={candidates} activeLabel={centerLabel} onCenterChange={handleCenterChange} />
      </div>

      <div className="h-[65vh] w-full overflow-hidden rounded-lg border max-sm:h-[calc(100dvh-13rem)]">
        <GoogleMap
          center={initialMapCenter}
          zoom={MAP_FOCUS_ZOOM}
          mapContainerStyle={MAP_CONTAINER_STYLE}
          options={MAP_OPTIONS}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          onDragEnd={handleDragEnd}
        >
          {isSameDepartureAndDestination && departure ? (
            <Marker position={departure} label="S/G" title={departure.label} />
          ) : (
            <>
              {departure && <Marker position={departure} label="S" title={departure.label} />}
              {destination && <Marker position={destination} label="G" title={destination.label} />}
            </>
          )}
          {planSpots.map((spot, index) => (
            <Marker
              key={spot.id}
              position={{ lat: spot.latitude, lng: spot.longitude }}
              label={String(index + 1)}
              title={`${toVisitNumberLabel(index)} ${spot.name}`}
            />
          ))}
        </GoogleMap>
      </div>
    </div>
  );
}

export default MapSpotSearch;
