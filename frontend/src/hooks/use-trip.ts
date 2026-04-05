import useSWR from 'swr';

import { Spot } from '@/types/plan';
import { TripDetailAPISpot, TripDetailAPIType, TripType } from '@/types/trip';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation } from '@/data/constants';

import { useFetcher } from './use-fetcher';

/**
 * バックエンドから取得した placeId のみのスポット情報を
 * Google Maps Places API で補完して Spot 型に変換する
 */
async function enrichSpot(spot: TripDetailAPISpot): Promise<Spot> {
  const result = await fetchPlaceDetailsWithRetry(spot.id);
  const meta = result.data;
  return {
    id: spot.id,
    location: {
      id: spot.id,
      name: meta?.name ?? '',
      lat: meta?.latitude ?? defaultLocation.lat,
      lng: meta?.longitude ?? defaultLocation.lng,
    },
    stayStart: spot.stayStart,
    stayEnd: spot.stayEnd,
    memo: spot.memo,
    image: meta?.image,
    url: meta?.url,
    prefecture: meta?.prefecture,
    address: meta?.address,
    rating: meta?.rating,
    category: meta?.categories,
    catchphrase: meta?.catchphrase,
    description: meta?.description,
    regularOpeningHours: meta?.openingHours,
    transports: spot.transports,
    order: spot.order,
    nearestStation: spot.nearestStation ?? undefined,
  };
}

/**
 * バックエンドから取得した TripDetailAPIType を
 * Google Maps データで補完した TripType に変換する
 */
async function enrichTripWithPlaceDetails(raw: TripDetailAPIType): Promise<TripType> {
  const enrichedPlans = await Promise.all(
    raw.plans.map(async (plan) => ({
      date: plan.date,
      spots: await Promise.all(plan.spots.map(enrichSpot)),
      departure: plan.departure,
      destination: plan.destination,
    })),
  );

  return {
    title: raw.title,
    imageUrl: raw.imageUrl,
    startDate: raw.startDate,
    endDate: raw.endDate,
    tripInfo: raw.tripInfo,
    plans: enrichedPlans,
  };
}

export const useFetchTripDetail = (tripId?: string) => {
  const { getFetcher, getAuthHeaders, isAuthenticated, isSessionLoading } = useFetcher();

  // セッションが確立されている場合のみAPIリクエストを発行
  const shouldFetch = isAuthenticated && !isSessionLoading;

  const url = shouldFetch && tripId ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${tripId}` : null;

  /** Google Maps Places API でスポット情報を補完するカスタムフェッチャー */
  const tripFetcher = async (key: string): Promise<TripType> => {
    const raw = (await getFetcher(key)) as TripDetailAPIType;
    return enrichTripWithPlaceDetails(raw);
  };

  const { data: trip, isLoading: isTripLoading, error: tripError } = useSWR<TripType>(url, tripFetcher);

  const {
    data: departureDestinationData,
    isLoading: isDepartureDepartmentLoading,
    error: departureDepartmentError,
  } = useSWR(shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots` : null, getFetcher);

  const postTrip = async (newTrip: TripType): Promise<number> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/create`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTrip),
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      const errorMessage = result.message || result.error || 'サーバーエラーが発生しました';
      throw new Error(errorMessage);
    }

    return result.id; // 作成された旅行計画のIDを返す
  };

  const isLoading = isSessionLoading || isTripLoading || isDepartureDepartmentLoading;
  const error = tripError || departureDepartmentError || null;

  return { trip, departureDestinationData, isLoading, error, postTrip };
};
