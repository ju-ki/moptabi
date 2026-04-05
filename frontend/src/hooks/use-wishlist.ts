import useSWR from 'swr';
import { useSession } from 'next-auth/react';

import { WishlistType } from '@/types/wishlist';
import { fetchPlaceDetailsWithRetry } from '@/lib/place-fetcher';
import { defaultLocation } from '@/data/constants';

import { useFetcher } from './use-fetcher';

/** バックエンドから返ってくる wishlist アイテムの生の型（spot.meta なし） */
type RawWishlistItem = Omit<WishlistType, 'spot'> & {
  spot: { id: string };
};

/**
 * バックエンドから取得した wishlist アイテム配列を
 * Google Maps Places API で補完して WishlistType[] に変換する
 */
async function enrichWishlistWithPlaceDetails(raw: RawWishlistItem[]): Promise<WishlistType[]> {
  return Promise.all(
    raw.map(async (item) => {
      const result = await fetchPlaceDetailsWithRetry(item.spotId);
      const meta = result.data;
      return {
        ...item,
        spot: {
          id: item.spotId,
          meta: {
            spotId: item.spotId,
            name: meta?.name ?? item.spotId,
            latitude: meta?.latitude ?? defaultLocation.lat,
            longitude: meta?.longitude ?? defaultLocation.lng,
            image: meta?.image,
            url: meta?.url,
            prefecture: meta?.prefecture,
            address: meta?.address,
            rating: meta?.rating ?? 0,
            categories: meta?.categories,
            catchphrase: meta?.catchphrase,
            description: meta?.description,
            openingHours: meta?.openingHours,
          },
        },
      } as WishlistType;
    }),
  );
}

export const useFetchWishlist = () => {
  const { data: session } = useSession();
  const { getFetcher, isSessionLoading } = useFetcher();

  const shouldFetch = !!session && !isSessionLoading;

  // 認証ヘッダーを生成
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.user?.id) {
      headers['X-User-Id'] = session.user.id;
    }
    if (session?.user?.email) {
      headers['X-User-Email'] = session.user.email;
    }
    if (session?.user?.name) {
      headers['X-User-Name'] = encodeURIComponent(session.user.name);
    }
    if (session?.user?.image) {
      headers['X-User-Image'] = session.user.image;
    }
    return headers;
  };

  /** Google Maps Places API でスポット情報を補完するカスタムフェッチャー */
  const wishlistFetcher = async (key: string): Promise<WishlistType[]> => {
    const raw = (await getFetcher(key)) as RawWishlistItem[];
    return enrichWishlistWithPlaceDetails(raw);
  };

  const { data, isLoading, error } = useSWR<WishlistType[]>(
    shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist` : null,
    wishlistFetcher,
  );

  const postWishlist = async (targetWishlist: WishlistType) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(targetWishlist),
      credentials: 'include',
    });
    return response;
  };

  const updateWishlist = async (updatedWishlist: WishlistType) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist/${updatedWishlist.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedWishlist),
      credentials: 'include',
    });
    return response;
  };
  const deleteWishlist = async (id: number) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return response;
  };
  return { data, isLoading, error, postWishlist, updateWishlist, deleteWishlist };
};
