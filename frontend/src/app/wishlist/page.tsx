'use client';

import React, { useEffect } from 'react';
import { Heart } from 'lucide-react';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import ListView from '@/components/wishlist/ListView';
import MapView from '@/components/wishlist/MapView';
import WishlistHeader from '@/components/wishlist/Header';
import { useFetchWishlist } from '@/hooks/use-wishlist';

const TravelWishlistApp = () => {
  const { data: wishlist, isLoading, error } = useFetchWishlist();
  const wishlistStore = useWishlistStore();
  const sortedWishlist = wishlistStore.getSortAndFilteredWishlist();

  useEffect(() => {
    if (!isLoading && wishlist) {
      wishlistStore.setWishlist(wishlist);
    }
  }, [isLoading, wishlist]);

  if (error) {
    return <div>エラーが発生しました</div>;
  }
  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 bg-white border-b border-gray-200  z-10">
        <WishlistHeader />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white h-full">
        {wishlistStore.getViewMode() === 'list' ? <ListView /> : <MapView />}

        {sortedWishlist.length === 0 && wishlistStore.getViewMode() === 'list' && (
          <div className="text-center py-16">
            <Heart size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">該当するスポットがありません</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelWishlistApp;
