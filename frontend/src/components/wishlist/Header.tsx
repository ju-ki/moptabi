import { Heart, List, Map } from 'lucide-react';
import React from 'react';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import { prefectures } from '@/data/constants';

import WishlistCreateModal from './WishlistCreateModal';

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
              role="button"
              name="list-view"
              aria-label="リストビューに切り替え"
              onClick={() => wishlistStore.setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                wishlistStore.getViewMode() === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List role="img" size={20} />
            </button>
            <button
              role="button"
              name="map-view"
              aria-label="マップビューに切り替え"
              onClick={() => wishlistStore.setViewMode('map')}
              className={`p-2 rounded-md transition-colors ${
                wishlistStore.getViewMode() === 'map'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Map role="img" size={20} />
            </button>
          </div>
        </div>

        {/* 検索条件 */}
        <div className="flex flex-wrap gap-3 items-center mb-2">
          {/* 都道府県は値を保持していないため、コメントアウト */}
          <div>
            <label aria-label="prefecture-label" htmlFor="prefecture-filter" className="text-sm mr-2">
              都道府県
            </label>
            <select
              id="prefecture-filter"
              aria-label="都道府県"
              value={wishlistStore.prefectureFilter ?? ''}
              onChange={(e) => wishlistStore.setPrefectureFilter(e.target.value ? e.target.value : null)}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700"
            >
              <option value="">全て</option>
              {prefectures.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-2">優先度</label>
            <select
              aria-label="優先度"
              value={wishlistStore.priorityFilter ?? ''}
              onChange={(e) => wishlistStore.setPriorityFilter(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700"
            >
              <option value="">全て</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-2">評価</label>
            <select
              aria-label="評価"
              value={wishlistStore.ratingFilter ?? ''}
              onChange={(e) => wishlistStore.setRatingFilter(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700"
            >
              <option value="">全て</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
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
              role="button"
              aria-label="未訪問フィルター"
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
              role="button"
              aria-label="訪問済みフィルター"
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
