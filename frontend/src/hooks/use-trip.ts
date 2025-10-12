import useSWR from 'swr';

import { ResponseTripType } from '@/types/plan';

import { useFetcher } from './use-fetcher';

export const useFetchTripDetail = (tripId?: string) => {
  const { getFetcher } = useFetcher();

  const {
    data: trip,
    isLoading,
    error,
  } = useSWR<ResponseTripType>(tripId ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${tripId}` : null, getFetcher);

  return { trip, isLoading, error };
};
