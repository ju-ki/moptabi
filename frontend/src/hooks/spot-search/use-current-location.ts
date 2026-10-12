import { useState, useEffect } from 'react';

import { Coordination } from '@/types/plan';

type UseCurrentLocationResult = {
  currentLocation: Coordination | null;
  isLocating: boolean;
  error: string | null;
};

export function useCurrentLocation(): UseCurrentLocationResult {
  const [currentLocation, setCurrentLocation] = useState<Coordination | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) {
      setError('このブラウザは位置情報をサポートしていません');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setCurrentLocation({
          id: 'current-location',
          name: '現在地',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        if (cancelled) return;
        setError('位置情報の取得に失敗しました');
        setIsLocating(false);
      },
      { timeout: 10000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return { currentLocation, isLocating, error };
}
