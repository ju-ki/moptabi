import { useEffect } from 'react';
import { GoogleMap, Marker, MarkerF, InfoWindow } from '@react-google-maps/api';
import Image from 'next/image';

import { useGoogleMap } from '@/hooks/use-google';
import { Coordination, Spot } from '@/types/plan';
const INITIALIZE_ZOOM = 13; // ズームレベル

const INITIALIZE_MAP_WIDTH = '100%'; // 地図の幅
const INITIALIZE_MAP_HEIGHT = '200px'; // 地図の高さ

const CONTAINER_STYLE = {
  width: INITIALIZE_MAP_WIDTH,
  height: INITIALIZE_MAP_HEIGHT,
};

interface GoogleMapCompProps {
  isSetCurrentLocation: boolean;
  searchedSpots?: Spot[];
  extraCoordinate?: Coordination;
  setCoordinate?: (coordination: Coordination | undefined) => void;
}

const GoogleMapComponent: React.FC<GoogleMapCompProps> = ({
  isSetCurrentLocation,
  searchedSpots,
  extraCoordinate,
  setCoordinate,
}: GoogleMapCompProps) => {
  const { map, mapCoordinate, selectedSpot, setSelectedSpot, handleMapClick, onLoad, onUnmount } = useGoogleMap(
    isSetCurrentLocation,
    extraCoordinate,
  );

  useEffect(() => {
    if (setCoordinate && mapCoordinate) {
      setCoordinate(mapCoordinate);
    }
  }, [mapCoordinate, setCoordinate]);

  useEffect(() => {
    if (!searchedSpots || searchedSpots.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    searchedSpots.forEach((spot) => {
      bounds.extend({ lat: spot.location.lat, lng: spot.location.lng });
    });

    if (!map) return;

    if (searchedSpots.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(17);
    } else {
      map.fitBounds(bounds);
    }
  }, [searchedSpots, map]);

  return (
    <GoogleMap
      id="map"
      mapContainerStyle={CONTAINER_STYLE}
      center={mapCoordinate}
      zoom={INITIALIZE_ZOOM}
      onClick={handleMapClick}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      <Marker position={mapCoordinate} />
      {searchedSpots?.map((spot) => (
        <MarkerF
          onClick={() => {
            setSelectedSpot(spot);
            map?.panTo({ lat: spot.location.lat, lng: spot.location.lng });
            map?.setZoom(17);
          }}
          key={spot.id}
          position={{ lat: spot.location.lat, lng: spot.location.lng }}
          title={spot.location.name}
        />
      ))}

      {selectedSpot ? (
        <InfoWindow
          position={{
            lat: selectedSpot.location.lat,
            lng: selectedSpot.location.lng,
          }}
          onCloseClick={() => {
            setSelectedSpot(null);
          }}
        >
          <div className="text-sm space-y-1">
            <div className="font-bold">{selectedSpot.location.name}</div>
            <Image
              src={selectedSpot.image ?? 'not_found.png'}
              alt={selectedSpot.location.name ?? ''}
              width={100}
              height={30}
              className="rounded-lg"
            />
            <div>⭐️ {selectedSpot.rating ?? '評価なし'}</div>
            <a
              href={selectedSpot.url ?? ''}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Googleマップで開く
            </a>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMap>
  );
};

export default GoogleMapComponent;
