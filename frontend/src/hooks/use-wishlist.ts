import useSWR from 'swr';
import { useSession } from 'next-auth/react';

import { WishlistType } from '@/types/wishlist';

import { useFetcher } from './use-fetcher';

export const useFetchWishlist = () => {
  const { data: session } = useSession();
  const { getFetcher } = useFetcher();

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

  const { data, isLoading, error } = useSWR<WishlistType[]>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist`,
    getFetcher,
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
