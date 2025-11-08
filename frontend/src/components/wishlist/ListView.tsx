import React from 'react';
import Image from 'next/image';
import { CheckCircle, Star, Trash2 } from 'lucide-react';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import { WishlistType } from '@/types/wishlist';


import { useState } from 'react';
import { useFetchWishlist } from '@/hooks/use-wishlist';
import { Button } from '../ui/button';

const ListView = () => {
  const wishlistStore = useWishlistStore();
  const wishlist = wishlistStore.getSortAndFilteredWishlist();
  const {updateWishlist, deleteWishlist} = useFetchWishlist();

  // Local state for editing memo per item
  const [editMemo, setEditMemo] = useState<{[id: string]: string}>({});

  // Helper to update memo in store
  const getItemKey = (item: WishlistType, idx: number) => (typeof item.id === 'string' ? item.id : String(idx));
  const handleMemoChange = (id: string, value: string) => {
    setEditMemo((prev) => ({ ...prev, [id]: value }));
  };
  const handleMemoSave = async(item: WishlistType, idx: number) => {
    const key = getItemKey(item, idx);
    wishlistStore.updateWishlist({ ...item, memo: editMemo[key] ?? item.memo });
    await updateWishlist({ ...item, memo: editMemo[key] ?? item.memo });
  };

  // Helper to update priority in store
  const handlePriorityChange = async(item: WishlistType, priority: number) => {
    wishlistStore.updateWishlist({ ...item, priority });
    await updateWishlist({ ...item, priority: priority });
  };

  // Helper to toggle visited in store
  const handleToggleVisited = async(item: WishlistType) => {
    wishlistStore.updateWishlist({ ...item, visited: item.visited ? 0 : 1 });
    await updateWishlist({ ...item, visited: item.visited ? 0 : 1 });
  };

  const handleToggleDeleted = async(id: number) => {
    wishlistStore.setWishlist(wishlistStore.getSortAndFilteredWishlist().filter((val) => val.id !== id));
    await deleteWishlist(id);
  }

  // Render editable stars
  const renderStars = (item: WishlistType) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          className={`${
            star <= item.priority
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          } cursor-pointer hover:scale-110 transition-transform`}
          onClick={() => handlePriorityChange(item, star)}
        />
      ))}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlist.length > 0 && wishlist.map((item, idx) => {
          const key = getItemKey(item, idx);
          return (
          <div
            key={idx}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md ${
              item.visited ? 'opacity-75' : ''
            }`}
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-gray-100">
              <Image
                width={200}
                height={200}
                src={item.spot.meta.image || ''}
                alt={item.spot.meta.name}
                className="w-full h-full object-cover"
              />
              {item.visited ? (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <CheckCircle size={14} />
                  訪問済み
                </div>
              ) : null}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.spot.meta.name}</h3>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-700">{item.spot.meta.rating}</span>
              </div>

              {/* Memo (editable) */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">メモ</p>
                <textarea
                  className="w-full px-2 py-1 border rounded text-sm mb-2"
                  value={editMemo[key] ?? item.memo ?? ''}
                  onChange={(e) => handleMemoChange(key, e.target.value)}
                  onBlur={() => handleMemoSave(item, idx)}
                  rows={2}
                />
              </div>

              {/* Priority (editable) */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">優先度</p>
                {renderStars(item)}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleToggleVisited(item)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-colors ${
                    item.visited
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {item.visited ? '未訪問に戻す' : '訪問済みにする'}
                </Button>
                <Button
                  onClick={() => handleToggleDeleted(item.id ?? 0)}
                  className="p-2 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          </div>
  );
  })}
      </div>
    </div>
  );
};

export default ListView;
