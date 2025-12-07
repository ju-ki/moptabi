'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { createPortal } from 'react-dom';

import { Coordination, TransportNodeType, TravelModeType } from '@/types/plan';
import { SpotMakerColors } from '@/data/constants';
import { RouteResult, useStoreForPlanning } from '@/lib/plan';
import { calcRoutes } from '@/lib/algorithm';

import DistanceInfo from './DistanceInfo';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const convertToTransportNameToId = (name: TravelModeType): number => {
  switch (name) {
    case 'WALKING':
      return 1; // 徒歩
    case 'DRIVING':
      return 2; // 車
    case 'TRANSIT':
      return 3; // 公共交通機関
    case 'BICYCLING':
      return 4; // 自転車
    case 'DEFAULT':
      return 0; // デフォルト（未指定）
    default:
      return 0; // デフォルト（未指定）
  }
};

interface TravelMapProps {
  date: string;
}

const TravelMap = ({ date }: TravelMapProps) => {
  const fields = useStoreForPlanning();
  const allSpots = fields.getSpotInfo(date, TransportNodeType.ALL);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [departureCoordination, setDepartureCoordination] = useState<Coordination>({
    id: '0',
    lat: 0,
    lng: 0,
    name: '',
  });
  const [destinationCoordination, setDestinationCoordination] = useState<Coordination>({
    id: '0',
    lat: 0,
    lng: 0,
    name: '',
  });
  const [spotCoordination, setSpotCoordination] = useState<Coordination[]>([]);
  const controlDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const result = fields.getSpotCoordination(date);
    if (!result) {
      return;
    }

    if (result?.departureCoordination) {
      const departure = result.departureCoordination;

      setDepartureCoordination({
        id: departure.id,
        lat: departure.location.lat,
        lng: departure.location.lng,
        name: departure.location.name,
      });
    }

    if (result?.destinationCoordination) {
      const destination = result.destinationCoordination;
      setDestinationCoordination({
        id: destination.id,
        lat: destination.location.lat,
        lng: destination.location.lng,
        name: destination.location.name,
      });
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
    if (!map || !departureCoordination || !destinationCoordination || !spotCoordination.length) return;

    // マップの表示範囲を計算
    const bounds = new google.maps.LatLngBounds();
    const path = [
      { lat: departureCoordination.lat, lng: departureCoordination.lng },
      ...spotCoordination.map((spot) => ({ lat: spot.lat, lng: spot.lng })),
      { lat: destinationCoordination.lat, lng: destinationCoordination.lng },
    ];
    path.forEach((point) => bounds.extend(point));

    const calculateRoutes = async () => {
      const tripInfo = fields.getTripInfo(date);
      const masterTransport = fields.getTransportMaster();
      const transportMethods = tripInfo?.transportationMethod || [];
      // 現状一つの移動手段のみ
      const targetTransportMethod = masterTransport.find((val) => transportMethods.includes(val.id))?.name || 'DEFAULT';

      const routeResults: RouteResult[] = [];
      let orderNumber = 0;

      // 出発地から最初の観光地
      const firstRoute = await calcRoutes(departureCoordination, spotCoordination[0], targetTransportMethod);

      fields.editSpots(date, departureCoordination.id, {
        transports: {
          transportMethodIds: [convertToTransportNameToId(firstRoute.travelMode)],
          name: firstRoute.travelMode || 'DEFAULT',
          travelTime: firstRoute.duration || '',
          fromType: TransportNodeType.DEPARTURE,
          toType: TransportNodeType.SPOT,
        },
        order: orderNumber,
      });

      routeResults.push(firstRoute);

      // 観光地間
      for (let i = 0; i < spotCoordination.length; i++) {
        orderNumber += 1;
        // 最後の観光地は目的地のルートを生成する
        if (i == spotCoordination.length - 1) {
          const lastRoute = await calcRoutes(spotCoordination[i], destinationCoordination, targetTransportMethod);
          routeResults.push(lastRoute);
          fields.editSpots(date, spotCoordination[i].id, {
            transports: {
              transportMethodIds: [convertToTransportNameToId(lastRoute.travelMode)],
              name: lastRoute.travelMode || 'DEFAULT',
              travelTime: lastRoute.duration || '',
              fromType: TransportNodeType.SPOT,
              toType: TransportNodeType.SPOT,
            },
            order: orderNumber,
          });

          orderNumber += 1;
          // 目的のスポットの情報更新
          fields.editSpots(date, destinationCoordination.id, {
            transports: {
              transportMethodIds: [convertToTransportNameToId('DEFAULT')],
              name: 'DEFAULT',
              travelTime: '',
              fromType: TransportNodeType.DESTINATION,
              toType: TransportNodeType.DESTINATION,
            },
            order: orderNumber,
          });
        } else {
          const route = await calcRoutes(spotCoordination[i], spotCoordination[i + 1], targetTransportMethod);
          fields.editSpots(date, spotCoordination[i].id, {
            transports: {
              transportMethodIds: [convertToTransportNameToId(route.travelMode)],
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
        center={{ lat: departureCoordination.lat, lng: departureCoordination.lng }}
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
          <DistanceInfo spots={allSpots} />,
          controlDivRef.current || (controlDivRef.current = document.createElement('div')),
        )}
        {/* 出発地のマーカー */}
        <Marker
          position={{ lat: departureCoordination.lat, lng: departureCoordination.lng }}
          icon={createCustomMarker(SpotMakerColors.DEPARTURE, '出発')}
          onClick={() =>
            setSelectedMarker({
              lat: departureCoordination.lat,
              lng: departureCoordination.lng,
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
          position={{ lat: destinationCoordination.lat, lng: destinationCoordination.lng }}
          icon={createCustomMarker(SpotMakerColors.DESTINATION, '到着')}
          onClick={() =>
            setSelectedMarker({
              lat: destinationCoordination.lat,
              lng: destinationCoordination.lng,
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
