import useSWR from 'swr';

import { useFetcher } from '@/hooks/use-fetcher';

/**
 * Tripの型定義
 */
type Trip = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
};

/**
 * Wishlistの型定義
 */
type WishlistItem = {
  id: number;
  visited: number;
};

/**
 * CountResponseの型定義
 */
type CountResponse = {
  count: number;
  limit: number;
};

/**
 * 次の旅の型定義
 */
type NextTrip = {
  id: number;
  title: string;
  startDate: string;
  daysUntil: number;
};

/**
 * 最近の旅の型定義
 */
type RecentTrip = {
  id: number;
  title: string;
  startDate: string;
};

/**
 * マイページデータの型定義
 */
export type MypageData = {
  // ローディング・エラー状態
  isLoading: boolean;
  error: Error | null;

  // 次の旅
  nextTrip: NextTrip | null;

  // サマリー
  visitedCount: number;
  wishlistCount: number;
  totalTripDays: number;

  // 利用状況
  planCount: number;
  planLimit: number;
  wishlistTotalCount: number;
  wishlistLimit: number;

  // 最近の旅
  recentTrips: RecentTrip[];
};

/**
 * 日付間の日数を計算する関数
 * @param startDate 開始日（YYYY-MM-DD形式）
 * @param endDate 終了日（YYYY-MM-DD形式）
 * @returns 日数（endDate - startDate + 1）
 */
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * 今日からの日数を計算する関数
 * @param targetDate 対象日（YYYY-MM-DD形式）
 * @returns 今日からの日数
 */
function calculateDaysUntil(targetDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 日付が今日より前かどうかを判定する関数
 * @param dateStr 日付文字列（YYYY-MM-DD形式）
 * @returns 今日より前ならtrue
 */
function isPastDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return date < today;
}

/**
 * 日付が今日より後かどうかを判定する関数
 * @param dateStr 日付文字列（YYYY-MM-DD形式）
 * @returns 今日より後ならtrue
 */
function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return date > today;
}

/**
 * マイページに必要なデータを一括で取得・整形するカスタムフック
 */
export function useMypageData(): MypageData {
  const { getFetcher } = useFetcher();

  // APIからデータを取得
  const {
    data: trips,
    error: tripsError,
    isLoading: tripsLoading,
  } = useSWR<Trip[]>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips`, getFetcher);

  const {
    data: tripsCount,
    error: tripsCountError,
    isLoading: tripsCountLoading,
  } = useSWR<CountResponse>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/count`, getFetcher);

  const {
    data: wishlist,
    error: wishlistError,
    isLoading: wishlistLoading,
  } = useSWR<WishlistItem[]>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist`, getFetcher);

  const {
    data: wishlistCount,
    error: wishlistCountError,
    isLoading: wishlistCountLoading,
  } = useSWR<CountResponse>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist/count`, getFetcher);

  // ローディング状態
  const isLoading = tripsLoading || tripsCountLoading || wishlistLoading || wishlistCountLoading;

  // エラー状態
  const error = tripsError || tripsCountError || wishlistError || wishlistCountError || null;

  // 次の旅の計算
  const nextTrip: NextTrip | null = (() => {
    if (!trips || trips.length === 0) return null;

    const futureTrips = trips
      .filter((trip) => isFutureDate(trip.startDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    if (futureTrips.length === 0) return null;

    const nearest = futureTrips[0];
    return {
      id: nearest.id,
      title: nearest.title,
      startDate: nearest.startDate,
      daysUntil: calculateDaysUntil(nearest.startDate),
    };
  })();

  // 旅した総日数の計算
  const totalTripDays: number = (() => {
    if (!trips || trips.length === 0) return 0;

    const pastTrips = trips.filter((trip) => isPastDate(trip.endDate));

    return pastTrips.reduce((total, trip) => {
      return total + calculateDays(trip.startDate, trip.endDate);
    }, 0);
  })();

  // 訪問済みスポット数
  const visitedCount: number = (() => {
    if (!wishlist || wishlist.length === 0) return 0;
    return wishlist.filter((item) => item.visited === 1).length;
  })();

  // 未訪問スポット数（行きたいスポット数）
  const wishlistUnvisitedCount: number = (() => {
    if (!wishlist || wishlist.length === 0) return 0;
    return wishlist.filter((item) => item.visited === 0).length;
  })();

  // 最近の旅（過去のプラン、最大3件）
  const recentTrips: RecentTrip[] = (() => {
    if (!trips || trips.length === 0) return [];

    return trips
      .filter((trip) => isPastDate(trip.endDate))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 3)
      .map((trip) => ({
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
      }));
  })();

  return {
    isLoading,
    error,
    nextTrip,
    visitedCount,
    wishlistCount: wishlistUnvisitedCount,
    totalTripDays,
    planCount: tripsCount?.count ?? 0,
    planLimit: tripsCount?.limit ?? 20,
    wishlistTotalCount: wishlistCount?.count ?? 0,
    wishlistLimit: wishlistCount?.limit ?? 100,
    recentTrips,
  };
}
