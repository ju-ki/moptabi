import useSWR from 'swr';
import { TripType } from '@shared/trip/types';

import { ExtendNearestStationType, ExtendPlanLocationType, ExtendSpotType, ExtendTripType, Spot } from '@/types/plan';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation } from '@/data/constants';
import { calculateDistance, estimateWalkingTime } from '@/data/mockNearestStation';

import { useFetcher } from './use-fetcher';

async function enrichTripWithPlaceDetails(trip: TripType): Promise<ExtendTripType> {
  const enrichedPlans = await Promise.all(
    trip.plans.map(async (plan) => {
      const enrichedSpots: ExtendSpotType[] = await Promise.all(
        plan.spots.map(async (spot) => {
          const placeResult = await fetchPlaceDetailsWithRetry(spot.id);
          let nearestStation: ExtendNearestStationType | undefined = undefined;
          if (spot.nearestStation) {
            const placeResultForStation = await fetchPlaceDetailsWithRetry(spot.nearestStation.placeId);
            nearestStation = {
              ...spot.nearestStation,
              name: placeResultForStation.data?.name || '',
              latitude: placeResultForStation.data?.latitude || defaultLocation.lat,
              longitude: placeResultForStation.data?.longitude || defaultLocation.lng,
              walkingTime: estimateWalkingTime(
                calculateDistance(
                  placeResult.data?.latitude || defaultLocation.lat,
                  placeResult.data?.longitude || defaultLocation.lng,
                  placeResultForStation.data?.latitude || defaultLocation.lat,
                  placeResultForStation.data?.longitude || defaultLocation.lng,
                ),
              ),
              transportMethodId: spot.transportMethodId,
            };
          }
          const enrichedSpot: ExtendSpotType = {
            ...spot,
            spotId: spot.id,
            name: placeResult.data?.name || '',
            latitude: placeResult.data?.latitude || defaultLocation.lat,
            longitude: placeResult.data?.longitude || defaultLocation.lng,
            rating: placeResult.data?.rating || 0,
            nearestStation: nearestStation,
            ...placeResult.data,
          };
          return enrichedSpot;
        }),
      );
      // 出発地の取得
      let nearestStationDeparture: ExtendNearestStationType | undefined = undefined;
      if (plan.departure.nearestStation) {
        const placeResultForDeparture = await fetchPlaceDetailsWithRetry(plan.departure.nearestStation.placeId);
        nearestStationDeparture = {
          ...plan.departure.nearestStation,
          name: placeResultForDeparture.data?.name || '',
          latitude: placeResultForDeparture.data?.latitude || defaultLocation.lat,
          longitude: placeResultForDeparture.data?.longitude || defaultLocation.lng,
          walkingTime: estimateWalkingTime(
            calculateDistance(
              plan.departure.latitude || defaultLocation.lat,
              plan.departure.longitude || defaultLocation.lng,
              placeResultForDeparture.data?.latitude || defaultLocation.lat,
              placeResultForDeparture.data?.longitude || defaultLocation.lng,
            ),
          ),
        };
      }
      // 目的地の取得
      let nearestStationDestination: ExtendNearestStationType | undefined = undefined;
      if (plan.destination.nearestStation) {
        const placeResultForDestination = await fetchPlaceDetailsWithRetry(plan.destination.nearestStation.placeId);
        nearestStationDestination = {
          ...plan.destination.nearestStation,
          name: placeResultForDestination.data?.name || '',
          latitude: placeResultForDestination.data?.latitude || defaultLocation.lat,
          longitude: placeResultForDestination.data?.longitude || defaultLocation.lng,
          walkingTime: estimateWalkingTime(
            calculateDistance(
              plan.destination.latitude || defaultLocation.lat,
              plan.destination.longitude || defaultLocation.lng,
              placeResultForDestination.data?.latitude || defaultLocation.lat,
              placeResultForDestination.data?.longitude || defaultLocation.lng,
            ),
          ),
        };
      }
      const enrichedDeparture: ExtendPlanLocationType = {
        ...plan.departure,
        nearestStation: nearestStationDeparture,
      };
      const enrichedDestination: ExtendPlanLocationType = {
        ...plan.destination,
        nearestStation: nearestStationDestination,
      };
      return {
        ...plan,
        departure: enrichedDeparture,
        destination: enrichedDestination,
        spots: enrichedSpots,
      };
    }),
  );
  return {
    ...trip,
    plans: enrichedPlans,
  } as ExtendTripType;
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
