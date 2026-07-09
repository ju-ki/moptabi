import type { CreateUserLocationRequest, UpdateUserLocationRequest, UserLocation } from '@/models/userLocation';

/** Tripのサマリー型 */
export type TripSummary = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
};

/** Wishlistのサマリー型 */
export type WishlistSummary = {
  id: number;
  visited: number;
};

/** 件数系レスポンス型 */
export type CountResponse = {
  count: number;
  limit: number;
};

/** 次の旅の表示型 */
export type NextTrip = {
  id: number;
  title: string;
  startDate: string;
  daysUntil: number;
};

/** 最近の旅の表示型 */
export type RecentTrip = {
  id: number;
  title: string;
  startDate: string;
};

/** マイページデータの集約型 */
export type MypageData = {
  isLoading: boolean;
  error: Error | null;
  nextTrip: NextTrip | null;
  visitedCount: number;
  wishlistCount: number;
  totalTripDays: number;
  planCount: number;
  planLimit: number;
  wishlistTotalCount: number;
  wishlistLimit: number;
  recentTrips: RecentTrip[];
  userLocations: UserLocation[];
  postUserLocation: (newUserLocation: CreateUserLocationRequest) => Promise<UserLocation>;
  updateUserLocation: (updatedUserLocation: UpdateUserLocationRequest) => Promise<Response>;
  deleteUserLocation: (id: number) => Promise<Response>;
};
