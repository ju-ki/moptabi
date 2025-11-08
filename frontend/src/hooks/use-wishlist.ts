import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';

import { WishlistType } from '@/types/wishlist';

import { useFetcher } from './use-fetcher';

export const useFetchWishlist = () => {
  const { getToken } = useAuth();
  const getWishlist = () => {
    const { getFetcher } = useFetcher();

    const { data, isLoading, error } = useSWR<WishlistType[]>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist`,
      getFetcher,
    );

    return { data, isLoading, error };
  };

  const postWishlist = async (targetWishlist: WishlistType) => {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(targetWishlist),
    });
    return response;
  };

  const updateWishlist = async (updatedWishlist: WishlistType) => {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist/${updatedWishlist.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedWishlist),
    });
    return response;
  };
  const deleteWishlist = async (id: number) => {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wishlist/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  };
  return { getWishlist, postWishlist, updateWishlist, deleteWishlist };
};
