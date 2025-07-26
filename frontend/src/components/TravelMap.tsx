'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';

import { TransportNodeType, TravelModeType, TravelPlanType } from '@/types/plan';
import { getRoute, RouteResult, useStoreForPlanning } from '@/lib/plan';

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
  travelPlan: TravelPlanType;
}

const TravelMap = ({ travelPlan }: TravelMapProps) => {
  const fields = useStoreForPlanning();
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const departureData = fields.getSpotInfo(travelPlan.date, TransportNodeType.DEPARTURE)[0];

  const destinationData = fields.getSpotInfo(travelPlan.date, TransportNodeType.DESTINATION)[0];

  const spots = fields.getSpotInfo(travelPlan.date, TransportNodeType.SPOT);

  // ルートを計算
  useEffect(() => {
    if (!map || !travelPlan) return;

    // マップの表示範囲を計算
    const bounds = new google.maps.LatLngBounds();
    const path = travelPlan
      ? [
          { lat: departureData.location.latitude, lng: departureData.location.longitude },
          ...spots.map((spot) => ({ lat: spot.location.latitude, lng: spot.location.longitude })),
          { lat: destinationData.location.latitude, lng: destinationData.location.longitude },
        ]
      : [];
    path.forEach((point) => bounds.extend(point));

    const calculateRoutes = async () => {
      const routeResults: RouteResult[] = [];
      let orderNumber = 0;

      // 出発地から最初の観光地
      const firstRoute = await getRoute(
        { lat: departureData.location.latitude, lng: departureData.location.longitude },
        { lat: spots[0].location.latitude, lng: spots[0].location.longitude },
      );

      fields.setSpots(
        travelPlan.date,
        {
          ...departureData,
          transports: {
            transportMethodIds: [convertToTransportNameToId(firstRoute.travelMode)],
            name: firstRoute.travelMode || 'DEFAULT',
            travelTime: firstRoute.duration || '',
            fromType: TransportNodeType.DEPARTURE,
            toType: TransportNodeType.SPOT,
          },
          order: orderNumber,
        },
        false,
      );

      routeResults.push(firstRoute);

      // 観光地間
      for (let i = 0; i < spots.length; i++) {
        orderNumber += 1;
        // 最後の観光地は目的地のルートを生成する
        if (i == spots.length - 1) {
          const lastRoute = await getRoute(
            {
              lat: spots[i].location.latitude,
              lng: spots[i].location.longitude,
            },
            { lat: destinationData.location.latitude, lng: destinationData.location.longitude },
          );
          routeResults.push(lastRoute);
          fields.setSpots(
            travelPlan.date,
            {
              ...spots[i],
              transports: {
                transportMethodIds: [convertToTransportNameToId(lastRoute.travelMode)],
                name: lastRoute.travelMode || 'DEFAULT',
                travelTime: lastRoute.duration || '',
                fromType: TransportNodeType.SPOT,
                toType: TransportNodeType.SPOT,
              },
              order: orderNumber,
            },
            false,
          );

          orderNumber += 1;
          // 目的のスポットの情報更新
          fields.setSpots(
            travelPlan.date,
            {
              ...destinationData,
              transports: {
                transportMethodIds: [convertToTransportNameToId('DEFAULT')],
                name: 'DEFAULT',
                travelTime: '',
                fromType: TransportNodeType.DESTINATION,
                toType: TransportNodeType.DESTINATION,
              },
              order: orderNumber,
            },
            false,
          );
        } else {
          const route = await getRoute(
            { lat: spots[i].location.latitude, lng: spots[i].location.longitude },
            { lat: spots[i + 1].location.latitude, lng: spots[i + 1].location.longitude },
          );
          fields.setSpots(
            travelPlan.date,
            {
              ...spots[i],
              transports: {
                transportMethodIds: [convertToTransportNameToId(route.travelMode)],
                name: route.travelMode || 'DEFAULT',
                travelTime: route.duration || '',
                fromType: TransportNodeType.SPOT,
                toType: TransportNodeType.SPOT,
              },
              order: orderNumber,
            },
            false,
          );
          routeResults.push(route);
        }
      }
    };

    calculateRoutes();
  }, [map]);

  if (!travelPlan) return null;

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
        center={{ lat: departureData.location.latitude, lng: departureData.location.longitude }}
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
        {/* 出発地のマーカー */}
        <Marker
          position={{ lat: departureData.location.latitude, lng: departureData.location.longitude }}
          icon={createCustomMarker('#FF0000', '出発')}
          onClick={() =>
            setSelectedMarker({
              lat: departureData.location.latitude,
              lng: departureData.location.longitude,
              name: departureData.location.name,
            })
          }
        />

        {/* 観光スポットのマーカー */}
        {spots.map((spot, index) => (
          <Marker
            key={spot.id}
            position={{ lat: spot.location.latitude, lng: spot.location.longitude }}
            icon={createCustomMarker('#4285F4', `${index + 1}`)}
            onClick={() =>
              setSelectedMarker({ lat: spot.location.latitude, lng: spot.location.longitude, name: spot.location.name })
            }
          />
        ))}
        {/* 目的地のマーカー */}
        <Marker
          position={{ lat: destinationData.location.latitude, lng: destinationData.location.longitude }}
          icon={createCustomMarker('#34A853', '到着')}
          onClick={() =>
            setSelectedMarker({
              lat: destinationData.location.latitude,
              lng: destinationData.location.longitude,
              name: destinationData.location.name,
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
