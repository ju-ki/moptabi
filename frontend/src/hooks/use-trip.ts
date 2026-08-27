import useSWR from 'swr';
import { TripType } from '@shared/trip/types';

import { ExtendNearestStationType, ExtendPlanLocationType, ExtendSpotType, ExtendTripType } from '@/types/plan';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation } from '@/data/constants';
import { calculateDistance, estimateWalkingTime } from '@/data/mockNearestStation';
import { SpotMetaType } from '@/types/spot';

import { useFetcher } from './use-fetcher';

async function fetchRequiredPlaceDetails(placeId: string): Promise<SpotMetaType> {
  const placeResult = await fetchPlaceDetailsWithRetry(placeId);

  if (placeResult.hasError) {
    throw new Error(`Failed to fetch place details for placeId: ${placeId}. Error: ${placeResult.errorMessage}`);
  }

  if (placeResult.data == null) {
    throw new Error(`Place details not found for placeId: ${placeId}`);
  }

  return placeResult.data;
}

async function enrichTripWithPlaceDetails(trip: TripType): Promise<ExtendTripType> {
  const enrichedPlans = await Promise.all(
    trip.plans.map(async (plan) => {
      // スポット本体の取得と処理
      const spotPromises = plan.spots.map(async (spot): Promise<ExtendSpotType | null> => {
        try {
          const placeResult = await fetchRequiredPlaceDetails(spot.id);

          let nearestStation: ExtendNearestStationType | undefined = undefined;
          if (spot.nearestStation) {
            try {
              const placeResultForStation = await fetchRequiredPlaceDetails(spot.nearestStation.placeId);
              nearestStation = {
                ...spot.nearestStation,
                name: placeResultForStation.name ?? '',
                latitude: placeResultForStation.latitude ?? defaultLocation.lat,
                longitude: placeResultForStation.longitude ?? defaultLocation.lng,
                walkingTime: estimateWalkingTime(
                  calculateDistance(
                    placeResult.latitude ?? defaultLocation.lat,
                    placeResult.longitude ?? defaultLocation.lng,
                    placeResultForStation.latitude ?? defaultLocation.lat,
                    placeResultForStation.longitude ?? defaultLocation.lng,
                  ),
                ),
                transportMethodId: spot.transportMethodId,
              };
            } catch (error) {
              console.error(
                `Failed to fetch nearest station for spot ${spot.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
              // nearestStationはundefinedのままでスポット処理は継続
            }
          }

          const enrichedSpot: ExtendSpotType = {
            ...placeResult,
            ...spot,
            spotId: spot.id,
            rating: placeResult.rating ?? 0,
            nearestStation: nearestStation,
          };
          return enrichedSpot;
        } catch (error) {
          console.error(
            `Failed to fetch place details for spot ${spot.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // スポット本体の取得失敗時はスキップ
          return null;
        }
      });

      const enrichedSpots: ExtendSpotType[] = (await Promise.all(spotPromises)).filter(
        (spot): spot is ExtendSpotType => spot !== null,
      );

      // 出発地の最寄り駅取得
      let nearestStationDeparture: ExtendNearestStationType | undefined = undefined;
      if (plan.departure.nearestStation) {
        try {
          const placeResultForDeparture = await fetchRequiredPlaceDetails(plan.departure.nearestStation.placeId);
          nearestStationDeparture = {
            ...plan.departure.nearestStation,
            name: placeResultForDeparture.name ?? '',
            latitude: placeResultForDeparture.latitude ?? defaultLocation.lat,
            longitude: placeResultForDeparture.longitude ?? defaultLocation.lng,
            walkingTime: estimateWalkingTime(
              calculateDistance(
                plan.departure.latitude ?? defaultLocation.lat,
                plan.departure.longitude ?? defaultLocation.lng,
                placeResultForDeparture.latitude ?? defaultLocation.lat,
                placeResultForDeparture.longitude ?? defaultLocation.lng,
              ),
            ),
          };
        } catch (error) {
          console.error(
            `Failed to fetch departure nearest station: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // nearestStationDepartureはundefinedのまま
        }
      }

      // 目的地の最寄り駅取得
      let nearestStationDestination: ExtendNearestStationType | undefined = undefined;
      if (plan.destination.nearestStation) {
        try {
          const placeResultForDestination = await fetchRequiredPlaceDetails(plan.destination.nearestStation.placeId);
          nearestStationDestination = {
            ...plan.destination.nearestStation,
            name: placeResultForDestination.name ?? '',
            latitude: placeResultForDestination.latitude ?? defaultLocation.lat,
            longitude: placeResultForDestination.longitude ?? defaultLocation.lng,
            walkingTime: estimateWalkingTime(
              calculateDistance(
                plan.destination.latitude ?? defaultLocation.lat,
                plan.destination.longitude ?? defaultLocation.lng,
                placeResultForDestination.latitude ?? defaultLocation.lat,
                placeResultForDestination.longitude ?? defaultLocation.lng,
              ),
            ),
          };
        } catch (error) {
          console.error(
            `Failed to fetch destination nearest station: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // nearestStationDestinationはundefinedのまま
        }
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
