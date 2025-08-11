import { useEffect, useState } from 'react';

import { Coordination, Spot } from '@/types/plan';

export const useGoogleMap = (initCoordinate: Coordination, isSetCurrentLocation: boolean) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapCoordinate, setMapCoordinate] = useState<Coordination>(initCoordinate);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  const onLoad = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  };

  const onUnmount = () => {
    setMap(null);
  };

  useEffect(() => {
    if (isSetCurrentLocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setMapCoordinate({ id: '', lat: position.coords.latitude, lng: position.coords.longitude });
      });
    }
  }, [isSetCurrentLocation]);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setMapCoordinate({ id: '', lat, lng });
    }
  };

  return {
    map,
    mapCoordinate,
    selectedSpot,
    setSelectedSpot,
    setMapCoordinate,
    handleMapClick,
    onLoad,
    onUnmount,
  };
};
