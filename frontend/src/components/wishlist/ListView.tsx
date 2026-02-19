import React from 'react';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';

import WishlistSpotInfoCard from './WishlistSpotInfoCard';

const ListView = () => {
  const wishlistStore = useWishlistStore();
  const wishlist = wishlistStore.getSortAndFilteredWishlist();

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlist.length > 0 &&
          wishlist.map((item, idx) => {
            return <WishlistSpotInfoCard key={item.id} item={item} idx={idx} />;
          })}
      </div>
    </div>
  );
};

export default ListView;
