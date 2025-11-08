import { Heart, List, Map, Search } from 'lucide-react';
import React, { useState } from 'react';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';

import WishlistCreateModal from './WishlistCreateModal';
// import { prefectures } from '@/data/constants';
const WishlistHeader = () => {
  const wishlistStore = useWishlistStore();
  return (
    <div>
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="text-pink-500 fill-pink-500" size={28} />
            行きたいリスト
          </h1>
          <div className="flex gap-2">
            <WishlistCreateModal />
            <button
              onClick={() => wishlistStore.setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                wishlistStore.getViewMode() === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => wishlistStore.setViewMode('map')}
              className={`p-2 rounded-md transition-colors ${
                wishlistStore.getViewMode() === 'map'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Map size={20} />
            </button>
          </div>
        </div>

        {/* 検索条件 */}
        <div className="flex flex-wrap gap-3 items-center mb-2">
            {/* 都道府県は値を保持していないため、コメントアウト */}
          {/* <div>
            <label className="text-sm mr-2">都道府県</label>
            <select
              value={wishlistStore.prefectureFilter || ''}
              onChange={e => wishlistStore.setPrefectureFilter(e.target.value || null)}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700"
            >
              <option value="">全て</option>
              {prefectures.filter(p => p).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div> */}
          <div>
            <label className="text-sm mr-2">優先度</label>
            <select
              value={wishlistStore.priorityFilter ?? ''}
              onChange={e => wishlistStore.setPriorityFilter(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700"
            >
              <option value="">全て</option>
              {[1,2,3,4,5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-2">評価</label>
            <select
              value={wishlistStore.ratingFilter ?? ''}
              onChange={e => wishlistStore.setRatingFilter(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700"
            >
              <option value="">全て</option>
              {[1,2,3,4,5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-0 bg-white rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => wishlistStore.setFilteredType('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                wishlistStore.getFilteredType() === 'all' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              全て
            </button>
            <button
              onClick={() => wishlistStore.setFilteredType('unvisited')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-x border-gray-300 ${
                wishlistStore.getFilteredType() === 'unvisited'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              未訪問
            </button>
            <button
              onClick={() => wishlistStore.setFilteredType('visited')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                wishlistStore.getFilteredType() === 'visited'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              訪問済み
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishlistHeader;
