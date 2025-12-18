import React from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import { WishlistType } from '@/types/wishlist';
import { useFetchWishlist } from '@/hooks/use-wishlist';
import { formatTimeDate } from '@/lib/utils';

import { Button } from '../ui/button';

const MAP_CENTER = { lat: 35.6762, lng: 139.6503 };
const MAP_ZOOM = 5;
const MAP_CONTAINER_STYLE = { width: '100%', height: '600px' };

const getPinColor = (visited: number) => (visited ? '#4ade80' : '#3b82f6'); // green for visited, blue for unvisited

const MapView = () => {
  const wishlistStore = useWishlistStore();
  const wishlist = wishlistStore.getSortAndFilteredWishlist();
  const selectedWishlist = wishlistStore.getSelectedWishlist();
  const { updateWishlist, deleteWishlist } = useFetchWishlist();

  // Edit actions
  const handleToggleVisited = async (item: WishlistType) => {
    wishlistStore.updateWishlist({ ...item, visited: item.visited ? 0 : 1 });
    await updateWishlist({ ...item, visited: item.visited ? 0 : 1 });
  };
  const handleDelete = async (id: number) => {
    wishlistStore.setWishlist(wishlistStore.getSortAndFilteredWishlist().filter((val) => val.id !== id));
    await deleteWishlist(id);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">マップビュー</h2>

      {/* Google Map */}
      <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={MAP_CENTER} zoom={MAP_ZOOM}>
        {wishlist.map((item) => (
          <Marker
            key={item.spotId}
            position={{ lat: item.spot.meta.latitude, lng: item.spot.meta.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: getPinColor(item.visited),
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#333',
            }}
            onClick={() => wishlistStore.setSelectedWishlist(item)}
          />
        ))}
        {selectedWishlist && (
          <InfoWindow
            position={{ lat: selectedWishlist.spot.meta.latitude, lng: selectedWishlist.spot.meta.longitude }}
            onCloseClick={() => wishlistStore.setSelectedWishlist(null)}
          >
            <div className="w-80">
              <h3 className="text-lg font-bold mb-1">{selectedWishlist.spot.meta.name}</h3>
              <div className="mb-2 text-xs text-gray-500">{selectedWishlist.spot.meta.description}</div>
              <div className="mb-2">
                <span className="font-semibold">優先度:</span> {selectedWishlist.priority}
              </div>
              <div className="mb-2">
                <span className="font-semibold">評価:</span> {selectedWishlist.spot.meta.rating}
              </div>
              <div className="mb-2">
                <span className="font-semibold">メモ:</span> {selectedWishlist.memo}
              </div>
              <div className="mb-2">
                <span className="font-semibold">訪問状況:</span> {selectedWishlist.visited ? '訪問済み' : '未訪問'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">訪問日時:</span>{' '}
                {formatTimeDate(selectedWishlist.visitedAt) || '未設定'}
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => handleToggleVisited(selectedWishlist)}>
                  {selectedWishlist.visited ? '未訪問に戻す' : '訪問済みにする'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedWishlist.id ?? 0)}>
                  行きたいリストから削除
                </Button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default MapView;
