import useSWR from 'swr';

import { ResponseTripType } from '@/types/plan';
import { TripType } from '@/types/trip';

import { useFetcher } from './use-fetcher';

export const useFetchTripDetail = (tripId?: string) => {
  const { getFetcher, getAuthHeaders } = useFetcher();

  const {
    data: trip,
    isLoading,
    error,
  } = useSWR<ResponseTripType>(tripId ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${tripId}` : null, getFetcher);

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

  return { trip, isLoading, error, postTrip };
};
