import useSWR from 'swr';

import { Spot } from '@/types/plan';
import { TripDetailApiResponse, TripDetailApiSpot, TripType } from '@/models/trip';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation, TransportMethodIdToLabel } from '@/data/constants';
import { DepartureAndDestinationType } from '@/models/planLocation';
import { calculateDistance, estimateWalkingTime } from '@/data/mockNearestStation';
// import { TripDetailResponseSchema } from '@shared/trip/schema';

import { useFetcher } from './use-fetcher';

type NearestStationInput = {
  placeId?: string;
  stationType?: 'BUS' | 'TRAIN' | 'OTHER';
  name?: string;
  walkingTime?: number;
  latitude?: number;
  longitude?: number;
  transitTime?: number;
  scheduledDepartureTime?: string;
  scheduledDepartureTimes?: string[];
  waitingTime?: number;
  memo?: string;
  transitMemo?: string;
};

async function enrichNearestStation(
  nearestStation: NearestStationInput | null | undefined,
  baseLocation: { lat: number; lng: number },
) {
  if (!nearestStation) return undefined;

  const result = nearestStation.placeId ? await fetchPlaceDetailsWithRetry(nearestStation.placeId) : null;
  const fetchedMeta = result?.data;

  const stationLat = nearestStation.latitude ?? fetchedMeta?.latitude;
  const stationLng = nearestStation.longitude ?? fetchedMeta?.longitude;
  const stationName = fetchedMeta?.name || nearestStation.name || '最寄駅';

  const calculatedWalkingTime =
    stationLat !== undefined && stationLng !== undefined
      ? estimateWalkingTime(calculateDistance(baseLocation.lat, baseLocation.lng, stationLat, stationLng))
      : undefined;

  const walkingTime =
    nearestStation.walkingTime && nearestStation.walkingTime > 0 ? nearestStation.walkingTime : calculatedWalkingTime;

  return {
    placeId: nearestStation.placeId,
    stationType: nearestStation.stationType,
    name: stationName,
    walkingTime,
    latitude: stationLat,
    longitude: stationLng,
    transitTime: nearestStation.transitTime,
    scheduledDepartureTime: nearestStation.scheduledDepartureTime,
    scheduledDepartureTimes: nearestStation.scheduledDepartureTimes,
    waitingTime: nearestStation.waitingTime,
    transitMemo: nearestStation.memo ?? nearestStation.transitMemo,
  };
}

/**
 * バックエンドから取得した placeId のみのスポット情報を
 * Google Maps Places API で補完して Spot 型に変換する
 */
async function enrichSpot(spot: TripDetailApiSpot): Promise<Spot> {
  const result = await fetchPlaceDetailsWithRetry(spot.id);
  const meta = result.data;
  const normalizedTransport = {
    transportMethod: spot.transports.transportMethod,
    name: TransportMethodIdToLabel[spot.transports.transportMethod],
    cost: spot.transports.cost,
    travelTime: spot.transports.travelTime,
    fromType: spot.transports.fromType,
    toType: spot.transports.toType,
  };
  const normalizedNearestStationRaw = await enrichNearestStation(spot.nearestStation, {
    lat: meta?.latitude ?? defaultLocation.lat,
    lng: meta?.longitude ?? defaultLocation.lng,
  });
  const normalizedNearestStation = normalizedNearestStationRaw
    ? {
        ...normalizedNearestStationRaw,
        spotId: spot.id,
        name: normalizedNearestStationRaw.name || '最寄駅',
        walkingTime: normalizedNearestStationRaw.walkingTime ?? 0,
        latitude: normalizedNearestStationRaw.latitude ?? defaultLocation.lat,
        longitude: normalizedNearestStationRaw.longitude ?? defaultLocation.lng,
      }
    : undefined;

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
    stayDuration: spot.stayDuration ?? 0,
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
    transports: normalizedTransport,
    order: spot.order,
    nearestStation: normalizedNearestStation,
  };
}

async function mapPlanLocationToFrontend(
  location: TripDetailApiResponse['plans'][number]['departure'],
): Promise<DepartureAndDestinationType> {
  const nearestStation = await enrichNearestStation(location.nearestStation, {
    lat: location.latitude,
    lng: location.longitude,
  });

  return {
    ...location,
    planId: null,
    planName: null,
    transports: {
      ...location.transports,
      fromType: location.transports?.fromType ?? 'SPOT',
      toType: location.transports?.toType ?? 'SPOT',
      transportMethod: location.transports ? location.transports.transportMethod : 0,
      name: TransportMethodIdToLabel[location.transports ? location.transports.transportMethod : 0],
    },
    nearestStation: nearestStation
      ? {
          ...nearestStation,
          placeId: nearestStation.placeId ?? '',
          stationType: nearestStation.stationType ?? 'OTHER',
        }
      : undefined,
  };
}

/**
 * バックエンドから取得した TripDetailApiResponse を
 * Google Maps データで補完した TripType に変換する
 */
async function enrichTripWithPlaceDetails(raw: TripDetailApiResponse): Promise<TripType> {
  const enrichedPlans = await Promise.all(
    raw.plans.map(async (plan) => {
      const departure = await mapPlanLocationToFrontend(plan.departure);
      const destination = await mapPlanLocationToFrontend(plan.destination);

      return {
        date: plan.date,
        spots: await Promise.all(plan.spots.map(enrichSpot)),
        departure,
        destination,
      };
    }),
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
    const raw = (await getFetcher(key)) as TripDetailApiResponse;
    return enrichTripWithPlaceDetails(raw);
  };

  const { data: trip, isLoading: isTripLoading, error: tripError } = useSWR<TripType>(url, tripFetcher);

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

  const isLoading = isSessionLoading || isTripLoading;
  const error = tripError || null;

  return { trip, isLoading, error, postTrip };
};
