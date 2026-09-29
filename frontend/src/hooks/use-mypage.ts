import useSWR from 'swr';

import { useFetcher } from '@/hooks/use-fetcher';
import { CreateUserLocationRequest, UpdateUserLocationRequest, UserLocation } from '@/models/userLocation';
import { CountResponse, MypageData, NextTrip, TripSummary, WishlistSummary } from '@/models/mypage';
import { calculateDistance, estimateWalkingTime } from '@/data/mockNearestStation';

import { fetchRequiredPlaceDetails } from './use-trip';

export type { MypageData };

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

function calculateDaysUntil(targetDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isPastDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return date < today;
}

function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return date > today;
}

async function enrichUserLocationWithNearestStation(userLocation: UserLocation): Promise<UserLocation> {
  if (!userLocation.nearestStation) {
    return userLocation;
  }

  try {
    const placeResultForStation = await fetchRequiredPlaceDetails(userLocation.nearestStation.placeId);
    return {
      ...userLocation,
      nearestStation: {
        ...userLocation.nearestStation,
        name: placeResultForStation.name ?? '',
        latitude: placeResultForStation.latitude ?? 0,
        longitude: placeResultForStation.longitude ?? 0,
        walkingTime: estimateWalkingTime(
          calculateDistance(
            userLocation.latitude ?? 0,
            userLocation.longitude ?? 0,
            placeResultForStation.latitude ?? 0,
            placeResultForStation.longitude ?? 0,
          ),
        ),
      },
    };
  } catch (error) {
    console.error(
      `Failed to fetch nearest station for user location ${userLocation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return userLocation;
  }
}

/**
 * マイページに必要なデータを一括で取得・整形するカスタムフック
 */
export function useMypageData(): MypageData {
  const { getFetcher, isAuthenticated, isSessionLoading, getAuthHeaders } = useFetcher();

  // セッションが確立されている場合のみAPIリクエストを発行
  const shouldFetch = isAuthenticated && !isSessionLoading;

  const {
    data: trips,
    error: tripsError,
    isLoading: tripsLoading,
  } = useSWR<TripSummary[]>(shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips` : null, getFetcher);

  const {
    data: tripsCount,
    error: tripsCountError,
    isLoading: tripsCountLoading,
  } = useSWR<CountResponse>(shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/count` : null, getFetcher);

  const {
    data: wishlist,
    error: wishlistError,
    isLoading: wishlistLoading,
  } = useSWR<WishlistSummary[]>(
    shouldFetch ? [`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist`, 'mypage'] : null,
    async (key) => {
      // 課題278対応、urlが重複しているためキーを持たせ、fetcher内でurlを取得して渡す
      const url = Array.isArray(key) ? key[0] : key;
      return getFetcher(url);
    },
  );

  const {
    data: wishlistCount,
    error: wishlistCountError,
    isLoading: wishlistCountLoading,
  } = useSWR<CountResponse>(shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist/count` : null, getFetcher);

  const userLocationFetcher = async (url: string) => {
    const raw = await getFetcher(url);
    return await Promise.all(raw.map(enrichUserLocationWithNearestStation));
  };

  const {
    data: userLocations,
    error: userLocationsError,
    isLoading: userLocationsLoading,
  } = useSWR<UserLocation[]>(
    shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/userLocation` : null,
    userLocationFetcher,
  );

  const postUserLocation = async (newUserLocation: CreateUserLocationRequest): Promise<UserLocation> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/userLocation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newUserLocation),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to create user location: ${response.status}`);
    }

    return response.json();
  };

  const updateUserLocation = async (updatedUserLocation: UpdateUserLocationRequest) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/userLocation/${updatedUserLocation.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedUserLocation),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to update user location: ${response.status}`);
    }

    return response;
  };

  const deleteUserLocation = async (id: number) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/userLocation/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user location: ${response.status}`);
    }

    return response;
  };

  const isLoading =
    isSessionLoading ||
    tripsLoading ||
    tripsCountLoading ||
    wishlistLoading ||
    wishlistCountLoading ||
    userLocationsLoading;

  const error = tripsError || tripsCountError || wishlistError || wishlistCountError || userLocationsError || null;

  // 次の旅（未来のプランを開始日昇順で最大3件）
  const nextTrips: NextTrip[] = (() => {
    if (!trips || trips.length === 0) return [];

    return trips
      .filter((trip) => isFutureDate(trip.startDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3)
      .map((trip) => ({
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        daysUntil: calculateDaysUntil(trip.startDate),
      }));
  })();

  // カレンダーデフォルト表示月：次の旅がある場合はその月、なければ現在月
  const defaultCalendarDate: Date = (() => {
    if (nextTrips.length > 0) {
      return new Date(nextTrips[0].startDate);
    }
    return new Date();
  })();

  const totalTripDays: number = (() => {
    if (!trips || trips.length === 0) return 0;

    const pastTrips = trips.filter((trip) => isPastDate(trip.endDate));

    return pastTrips.reduce((total, trip) => {
      return total + calculateDays(trip.startDate, trip.endDate);
    }, 0);
  })();

  const visitedCount: number = (() => {
    if (!wishlist || wishlist.length === 0) return 0;
    return wishlist.filter((item) => item.visited === 1).length;
  })();

  const wishlistUnvisitedCount: number = (() => {
    if (!wishlist || wishlist.length === 0) return 0;
    return wishlist.filter((item) => item.visited === 0).length;
  })();

  return {
    isLoading,
    error,
    trips: trips ?? [],
    nextTrips,
    defaultCalendarDate,
    visitedCount,
    wishlistCount: wishlistUnvisitedCount,
    totalTripDays,
    planCount: tripsCount?.count ?? 0,
    planLimit: tripsCount?.limit ?? 20,
    wishlistTotalCount: wishlistCount?.count ?? 0,
    wishlistLimit: wishlistCount?.limit ?? 100,
    userLocations: userLocations ?? [],
    postUserLocation,
    updateUserLocation,
    deleteUserLocation,
  };
}
