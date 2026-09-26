/**
 * プラン作成時の出発地・目的地候補を取得するフック
 */
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import {
  LocationType,
  PlanLocation,
  PlanLocationCandidatesResponse,
  CreatePlanLocationRequest,
} from '@/models/planLocation';
import { calculateDistance, estimateWalkingTime } from '@/data/mockNearestStation';

import { useFetcher } from './use-fetcher';
import { fetchRequiredPlaceDetails } from './use-trip';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function enrichUserLocationWithNearestStation(candidate: PlanLocationCandidatesResponse) {
  const updatedFavorites = candidate.favorites.map(async (favorite) => {
    if (!favorite.nearestStation || !favorite.nearestStation.placeId) {
      return favorite;
    }
    const placeResultForStation = await fetchRequiredPlaceDetails(favorite.nearestStation?.placeId ?? '');
    favorite.nearestStation = {
      ...favorite.nearestStation,
      placeId: favorite.nearestStation?.placeId,
      latitude: placeResultForStation?.latitude ?? 0,
      longitude: placeResultForStation?.longitude ?? 0,
      name: placeResultForStation?.name ?? '',
      transitTime: 0,
      stationType: favorite.nearestStation?.stationType ?? 'OTHER',
      walkingTime: estimateWalkingTime(
        calculateDistance(
          favorite.latitude,
          favorite.longitude,
          placeResultForStation?.latitude ?? 0,
          placeResultForStation?.longitude ?? 0,
        ),
      ),
    };
    return {
      ...favorite,
    };
  });
  candidate.favorites = await Promise.all(updatedFavorites);
  return candidate;
}

/**
 * PlanLocation候補を取得するフック
 * @param locationType - DEPARTURE または DESTINATION
 * @param limit - 取得件数（デフォルト10）
 */
export function usePlanLocationCandidates(locationType?: LocationType, limit?: number) {
  const { getFetcher, isAuthenticated, isSessionLoading } = useFetcher();

  // クエリパラメータを構築
  const queryParams = new URLSearchParams();
  if (locationType) {
    queryParams.append('locationType', locationType);
  }
  if (limit) {
    queryParams.append('limit', String(limit));
  }
  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/plan-location/candidates${queryString ? `?${queryString}` : ''}`;

  const shouldFetch = isAuthenticated && !isSessionLoading;

  const planLocationFetcher = async (url: string): Promise<PlanLocationCandidatesResponse> => {
    const raw = await getFetcher(url);
    const enriched = await enrichUserLocationWithNearestStation(raw);
    return enriched;
  };

  const { data, error, isLoading, mutate } = useSWR<PlanLocationCandidatesResponse>(
    shouldFetch ? url : null,
    planLocationFetcher,
  );

  return {
    candidates: data,
    isLoading: isSessionLoading || isLoading,
    error,
    mutate,
  };
}

/**
 * PlanLocation一覧を取得するフック
 * @param locationType - DEPARTURE または DESTINATION（オプション）
 */
export function usePlanLocationList(locationType?: LocationType) {
  const { getFetcher, isAuthenticated, isSessionLoading } = useFetcher();

  const queryParams = new URLSearchParams();
  if (locationType) {
    queryParams.append('locationType', locationType);
  }
  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/plan-location${queryString ? `?${queryString}` : ''}`;

  const shouldFetch = isAuthenticated && !isSessionLoading;

  const { data, error, isLoading, mutate } = useSWR<PlanLocation[]>(shouldFetch ? url : null, getFetcher);

  return {
    planLocations: data ?? [],
    isLoading: isSessionLoading || isLoading,
    error,
    mutate,
  };
}

/**
 * PlanLocationを作成するフック
 */
export function useCreatePlanLocation() {
  const { getAuthHeaders } = useFetcher();

  const createFetcher = async (url: string, { arg }: { arg: CreatePlanLocationRequest }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arg),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(errorMessage || 'エラーが発生しました');
    }

    return response.json();
  };

  const { trigger, isMutating, error } = useSWRMutation(`${API_BASE_URL}/plan-location`, createFetcher);

  return {
    createPlanLocation: trigger,
    isCreating: isMutating,
    error,
  };
}

/**
 * PlanLocationを削除するフック
 */
export function useDeletePlanLocation() {
  const { getAuthHeaders } = useFetcher();

  const deleteFetcher = async (url: string, { arg }: { arg: { id: number } }) => {
    const response = await fetch(`${url}/${arg.id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(errorMessage || 'エラーが発生しました');
    }

    return response.json();
  };

  const { trigger, isMutating, error } = useSWRMutation(`${API_BASE_URL}/plan-location`, deleteFetcher);

  return {
    deletePlanLocation: trigger,
    isDeleting: isMutating,
    error,
  };
}
