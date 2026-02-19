import { useEffect, useState } from 'react';

import { Coordination, Spot } from '@/types/plan';

import { defaultLocation } from '../data/constants';

export const useGoogleMap = (isSetCurrentLocation: boolean, extraCoordinate?: Coordination) => {
  const initCoordinate: Coordination = defaultLocation; // 初期座標（東京駅）
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
        const newCoordinate = { id: '', lat: position.coords.latitude, lng: position.coords.longitude, name: '' };
        setMapCoordinate(newCoordinate);
        if (map) {
          map.panTo(newCoordinate);
        }
      });
    }
  }, [isSetCurrentLocation, map]);

  useEffect(() => {
    if (extraCoordinate) {
      setMapCoordinate(extraCoordinate);
      if (map) {
        const newCoordinate = { id: '', lat: extraCoordinate.lat, lng: extraCoordinate.lng };
        map.panTo(newCoordinate);
      }
    }
  }, [extraCoordinate, map]);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setMapCoordinate({ id: '', lat, lng, name: '' });
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
