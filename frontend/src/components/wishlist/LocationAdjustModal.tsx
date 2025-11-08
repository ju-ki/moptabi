import React, { useState } from 'react';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

// ユーザー側で起点となる中心地の調整を行うためのモーダル
const containerStyle = {
  width: '100%',
  height: '100%',
};

const circleOptions = {
  strokeColor: '#FF0000',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#FF0000',
  fillOpacity: 0.35,
  clickable: false,
  draggable: false,
  editable: false,
  visible: true,
  radius: 30000,
  zIndex: 1,
};

interface LocationAdjustModalProps {
  onConfirm: () => void;
}

const LocationAdjustModal = ({ onConfirm }: LocationAdjustModalProps) => {
  const mapSelectOpen = useWishlistStore((state) => state.mapSelectOpen);
  const setMapSelectOpen = useWishlistStore((state) => state.setSelectMapOpen);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const searchCenter = useWishlistStore((state) => state.searchCenter);
  const setSearchCenter = useWishlistStore((state) => state.setSearchCenter);
  const searchRadius = useWishlistStore((state) => state.searchRadius);

  if (!searchCenter) {
    return null;
  }

  const onUnmount = () => {
    setMap(null);
  };

  return (
    <Dialog open={mapSelectOpen} onOpenChange={setMapSelectOpen}>
      <DialogContent className="max-w-4xl h-[80vh] p-8">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-bold">検索位置を調整</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <GoogleMap
              center={searchCenter}
              mapContainerStyle={containerStyle}
              options={{
                zoom: 12,
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'on' }],
                  },
                  {
                    featureType: 'transit',
                    elementType: 'labels',
                    stylers: [{ visibility: 'on' }],
                  },
                ],
              }}
              onClick={(e) =>
                e.latLng?.lat &&
                e.latLng?.lng &&
                setSearchCenter({ id: 'clicked-center', lat: e.latLng.lat(), lng: e.latLng.lng() })
              }
              onLoad={(map) => {
                setMap(map);
              }}
              onUnmount={onUnmount}
            >
              <Marker
                position={searchCenter}
                onClick={() => setSearchCenter({ id: searchCenter.id, lat: searchCenter.lat, lng: searchCenter.lng })}
              />
              <Circle center={searchCenter} radius={searchRadius[0] * 1000} options={circleOptions} />
            </GoogleMap>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-5">
          <Button variant={'outline'} onClick={() => setMapSelectOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={() => {
              setMapSelectOpen(false);
              onConfirm();
            }}
          >
            この位置で検索
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationAdjustModal;
