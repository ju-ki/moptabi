import useSWR from 'swr';
import { TripType} from "@shared/trip/types";

import { ExtendNearestStationType, ExtendPlanLocationType, ExtendSpotType, ExtendTripType, Spot } from '@/types/plan';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation, TransportMethodIdToLabel } from '@/data/constants';
import { calculateDistance, estimateWalkingTime } from '@/data/mockNearestStation';

import { useFetcher } from './use-fetcher';

async function enrichTripWithPlaceDetails(trip: TripType): Promise<ExtendTripType> {
  
  return trip as ExtendTripType;
}



export const useFetchTripDetail = (tripId?: string) => {
  const { getFetcher, getAuthHeaders, isAuthenticated, isSessionLoading } = useFetcher();

  // セッションが確立されている場合のみAPIリクエストを発行
  const shouldFetch = isAuthenticated && !isSessionLoading;

  const url = shouldFetch && tripId ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${tripId}` : null;

  /** Google Maps Places API でスポット情報を補完するカスタムフェッチャー */
  const tripFetcher = async (key: string): Promise<ExtendTripType> => {
    const raw = (await getFetcher(key)) as TripType;
    return enrichTripWithPlaceDetails(raw);
  };

  const { data: trip, isLoading: isTripLoading, error: tripError } = useSWR<ExtendTripType>(url, tripFetcher);

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

  const patchTrip = async (id: number, newTrip: TripType): Promise<number> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${id}`, {
      method: 'PATCH',
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

  const isLoading = isSessionLoading || isTripLoading;
  const error = tripError || null;

  return { trip, isLoading, error, postTrip, patchTrip };
};
