'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { createPortal } from 'react-dom';

import { Coordination, TransportNodeType, TravelModeType } from '@/types/plan';
import { SpotMakerColors, TransportMethods } from '@/data/constants';
import { RouteResult, useStoreForPlanning } from '@/lib/plan';
import { calcRoutes } from '@/lib/algorithm';

import DistanceInfo from './DistanceInfo';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

interface TravelMapProps {
  date: string;
}

const TravelMap = ({ date }: TravelMapProps) => {
  const fields = useStoreForPlanning();
  const allSpots = fields.getSpotInfo(date, TransportNodeType.SPOT);
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [spotCoordination, setSpotCoordination] = useState<Coordination[]>([]);
  const controlDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const result = fields.getSpotCoordination(date);
    if (!result) {
      return;
    }

    if (result?.spotCoordination && Array.isArray(result.spotCoordination)) {
      setSpotCoordination(
        result.spotCoordination.map((spot) => ({
          id: spot.id,
          lat: spot.location.lat,
          lng: spot.location.lng,
          name: spot.location.name,
        })),
      );
    }

    setRoutes([]); // ルートをリセット
  }, [date]);

  // ルートを計算
  useEffect(() => {
    if (!map || !departureData || !destinationData || !spotCoordination.length) return;

    // マップの表示範囲を計算
    const bounds = new google.maps.LatLngBounds();
    const path = [
      { lat: departureData.latitude, lng: departureData.longitude },
      ...spotCoordination.map((spot) => ({ lat: spot.lat, lng: spot.lng })),
      { lat: destinationData.latitude, lng: destinationData.longitude },
    ];
    path.forEach((point) => bounds.extend(point));

    const calculateRoutes = async () => {
      const tripInfo = fields.getTripInfo(date);
      const transportMethod = tripInfo?.transportationMethod;
      // IDからキー名を取得するヘルパー
      const getTransportKeyById = (id: number | undefined): TravelModeType => {
        if (!id) return 'WALKING';
        const entry = Object.entries(TransportMethods).find(([, val]) => val.id === id);
        return (entry ? entry[0] : 'WALKING') as TravelModeType;
      };
      // 現状一つの移動手段のみ選択可能
      const targetTransportMethod = getTransportKeyById(transportMethod);

      const routeResults: RouteResult[] = [];
      let orderNumber = 0;

      // 出発地から最初の観光地
      const firstRoute = await calcRoutes(
        { id: departureData.name, lat: departureData.latitude, lng: departureData.longitude, name: departureData.name },
        spotCoordination[0],
        targetTransportMethod,
      );

      fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
        ...departureData,
        transports: {
          transportMethod: TransportMethods[firstRoute.travelMode].id,
          name: firstRoute.travelMode || 'DEFAULT',
          travelTime: firstRoute.duration || '',
          fromType: TransportNodeType.DEPARTURE,
          toType: TransportNodeType.SPOT,
        },
      });

      routeResults.push(firstRoute);

      // 観光地間
      for (let i = 0; i < spotCoordination.length; i++) {
        orderNumber += 1;
        // 最後の観光地は目的地のルートを生成する
        if (i == spotCoordination.length - 1) {
          const lastRoute = await calcRoutes(
            spotCoordination[i],
            {
              id: destinationData.name,
              lat: destinationData.latitude,
              lng: destinationData.longitude,
              name: destinationData.name,
            },
            targetTransportMethod,
          );
          routeResults.push(lastRoute);
          fields.editSpots(date, spotCoordination[i].id, {
            transports: {
              transportMethod: TransportMethods[lastRoute.travelMode].id,
              name: lastRoute.travelMode || 'DEFAULT',
              travelTime: lastRoute.duration || '',
              fromType: TransportNodeType.SPOT,
              toType: TransportNodeType.SPOT,
            },
            order: orderNumber,
          });

          orderNumber += 1;
          // 目的のスポットの情報更新
          fields.setDepartureAndDestination(date, TransportNodeType.DESTINATION, {
            ...destinationData,
            transports: {
              transportMethod: TransportMethods[lastRoute.travelMode].id,
              name: lastRoute.travelMode || 'DEFAULT',
              travelTime: lastRoute.duration || '',
              fromType: TransportNodeType.SPOT,
              toType: TransportNodeType.DESTINATION,
            },
          });
        } else {
          const route = await calcRoutes(spotCoordination[i], spotCoordination[i + 1], targetTransportMethod);
          fields.editSpots(date, spotCoordination[i].id, {
            transports: {
              transportMethod: TransportMethods[route.travelMode].id,
              name: route.travelMode || 'DEFAULT',
              travelTime: route.duration || '',
              fromType: TransportNodeType.SPOT,
              toType: TransportNodeType.SPOT,
            },
            order: orderNumber,
          });
          routeResults.push(route);
        }
      }

      setRoutes(routeResults);
    };

    calculateRoutes();
  }, [map]);

  useEffect(() => {
    if (!map || !controlDivRef.current) {
      return;
    }

    const controls = map.controls[google.maps.ControlPosition.TOP_RIGHT];
    const controlDiv = controlDivRef.current;
    controls.push(controlDiv);

    return () => {
      const index = controls.getArray().indexOf(controlDiv);
      if (index > -1) {
        controls.removeAt(index);
      }
    };
  }, [controlDivRef, map]);

  // カスタムマーカーアイコン
  const createCustomMarker = (color: string, label: string) => ({
    path: 2,
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#FFFFFF',
    scale: 8,
    label: {
      text: label,
      color: '#FFFFFF',
      fontSize: '12px',
      fontWeight: 'bold',
    },
  });

  return (
    <div className="relative">
      <GoogleMap
        center={{ lat: departureData.latitude, lng: departureData.longitude }}
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
        onLoad={(map) => {
          setMap(map);
          // map.fitBounds(bounds);
          // map.panToBounds(bounds);
        }}
      >
        {createPortal(
          <DistanceInfo spots={allSpots} date={date} />,
          controlDivRef.current || (controlDivRef.current = document.createElement('div')),
        )}
        {/* 出発地のマーカー */}
        <Marker
          position={{ lat: departureData.latitude, lng: departureData.longitude }}
          icon={createCustomMarker(SpotMakerColors.DEPARTURE, '出発')}
          onClick={() =>
            setSelectedMarker({
              lat: departureData.latitude,
              lng: departureData.longitude,
              name: '出発地',
            })
          }
        />

        {/* 観光スポットのマーカー */}
        {spotCoordination.map((spot, index) => (
          <Marker
            key={spot.id}
            position={{ lat: spot.lat, lng: spot.lng }}
            icon={createCustomMarker(SpotMakerColors.SPOT, `${index + 1}`)}
            onClick={() =>
              setSelectedMarker({ lat: spot.lat, lng: spot.lng, name: spot?.name || `スポット ${index + 1}` })
            }
          />
        ))}
        {/* 目的地のマーカー */}
        <Marker
          position={{ lat: destinationData.latitude, lng: destinationData.longitude }}
          icon={createCustomMarker(SpotMakerColors.DESTINATION, '到着')}
          onClick={() =>
            setSelectedMarker({
              lat: destinationData.latitude,
              lng: destinationData.longitude,
              name: '目的地',
            })
          }
        />

        {/* 選択されたマーカーの情報ウィンドウ */}
        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2">
              <h3 className="font-semibold">{selectedMarker.name}</h3>
            </div>
          </InfoWindow>
        )}

        {/* ルートを表示 */}
        {routes.map((route, index) => (
          <Polyline
            key={index}
            path={route.path}
            options={{
              strokeColor: index === 0 ? '#FF0000' : index === routes.length - 1 ? '#34A853' : '#4285F4',
              strokeOpacity: 0.8,
              strokeWeight: index === 0 || index === routes.length - 1 ? 3 : 2,
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default TravelMap;
