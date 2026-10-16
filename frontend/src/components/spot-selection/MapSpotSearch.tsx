'use client';

import { useMemo } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

import { useStoreForPlanning } from '@/lib/plan';
import { filterActualSpots } from '@/lib/utils';
import { defaultLocation } from '@/data/constants';
import { Coordination, ExtendPlanLocationType, ExtendSpotType } from '@/types/plan';

type MapSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: ExtendSpotType, isDeleted: boolean) => void;
  isLimitReached: boolean;
  limitsError: boolean;
};

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const toCoordination = (id: string, location: ExtendPlanLocationType | undefined): Coordination | null => {
  if (!location?.name || location.latitude == null || location.longitude == null) return null;
  return { id, name: location.name, lat: location.latitude, lng: location.longitude };
};

/**
 * 地図で探す（No.341）
 * 出発地・目的地・その日のスポットを地図に出す
 */
export function MapSpotSearch({ date }: MapSpotSearchProps) {
  const { plans } = useStoreForPlanning();
  const plan = useMemo(() => plans.find((p) => p.date === date), [plans, date]);
  const departure = toCoordination('departure', plan?.departure);
  const destination = toCoordination('destination', plan?.destination);
  const spots = filterActualSpots(plan?.spots ?? []);
  // 初期中心は目的地 → 出発地 → 東京駅
  const center = destination ?? departure ?? defaultLocation;

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-lg border max-sm:h-[calc(100dvh-14rem)]">
      <GoogleMap
        center={{ lat: center.lat, lng: center.lng }}
        zoom={15}
        mapContainerStyle={MAP_CONTAINER_STYLE}
        options={{ clickableIcons: true, streetViewControl: false, mapTypeControl: false }}
      >
        {departure && <Marker position={departure} label="S" title={departure.name} />}
        {destination && <Marker position={destination} label="G" title={destination.name} />}
        {spots.map((spot, index) => (
          <Marker
            key={spot.id}
            position={{ lat: spot.latitude, lng: spot.longitude }}
            label={String(index + 1)}
            title={spot.name}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

export default MapSpotSearch;
