'use client';

import { useWishlistSpots } from '@/hooks/spot-search/use-wishlist-spots';
import { ExtendSpotType, Spot } from '@/types/plan';

type WishlistPinLayerProps = {
  renderPin: (spot: ExtendSpotType) => React.ReactNode;
};

const toExtendSpot = (spot: Spot): ExtendSpotType => ({
  ...spot,
  spotId: spot.id,
  rating: spot.rating ?? 0,
  name: spot.location.name,
  latitude: spot.location.lat,
  longitude: spot.location.lng,
  transportMethod: 'DEFAULT',
  transportMethodId: 0,
  travelTime: 0,
  stayDuration: 60,
  order: 0,
});

/**
 * 行きたいリストのピン（No.341）
 * ON のときだけマウントし、行きたいリストの取得（ユーザー別上限の件数まで）を始める
 */
export function WishlistPinLayer({ renderPin }: WishlistPinLayerProps) {
  const { spots } = useWishlistSpots();
  return <>{(spots ?? []).map((spot) => renderPin(toExtendSpot(spot)))}</>;
}

export default WishlistPinLayer;
