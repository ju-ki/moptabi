import useSWR from 'swr';

import { ResponseTripType } from '@/types/plan';
import { TripType } from '@/types/trip';

import { useFetcher } from './use-fetcher';

type ResponseCreatedTripType = {
  id: number;
};

export const useFetchTripDetail = (tripId?: string) => {
  const { getFetcher, getAuthHeaders } = useFetcher();

  const {
    data: trip,
    isLoading,
    error,
  } = useSWR<ResponseTripType>(tripId ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${tripId}` : null, getFetcher);

  const postTrip = async (newTrip: TripType): Promise<ResponseCreatedTripType> => {
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

    return result.id; // 作成された旅行計画のid
  };

  return { trip, isLoading, error, postTrip };
};
