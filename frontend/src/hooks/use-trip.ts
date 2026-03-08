import useSWR from 'swr';

import { TripType } from '@/types/trip';

import { useFetcher } from './use-fetcher';

export const useFetchTripDetail = (tripId?: string) => {
  const { getFetcher, getAuthHeaders, isAuthenticated, isSessionLoading } = useFetcher();

  // セッションが確立されている場合のみAPIリクエストを発行
  const shouldFetch = isAuthenticated && !isSessionLoading;

  const {
    data: trip,
    isLoading: isTripLoading,
    error: tripError,
  } = useSWR<TripType>(
    shouldFetch && tripId ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${tripId}` : null,
    getFetcher,
  );

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
