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
  endDate: string;
  daysUntil: number;
};

/** マイページデータの集約型 */
export type MypageData = {
  isLoading: boolean;
  error: Error | null;
  trips: TripSummary[];
  nextTrips: NextTrip[];
  defaultCalendarDate: Date;
  visitedCount: number;
  wishlistCount: number;
  totalTripDays: number;
  planCount: number;
  planLimit: number;
  wishlistTotalCount: number;
  wishlistLimit: number;
  userLocations: UserLocation[];
  postUserLocation: (newUserLocation: CreateUserLocationRequest) => Promise<UserLocation>;
  updateUserLocation: (updatedUserLocation: UpdateUserLocationRequest) => Promise<Response>;
  deleteUserLocation: (id: number) => Promise<Response>;
};
