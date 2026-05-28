'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { createPortal } from 'react-dom';

import { Coordination, TransportNodeType, TravelModeType, NearestStation as PlanNearestStation } from '@/types/plan';
import { SpotMakerColors } from '@/data/constants';
import { RouteResult, useStoreForPlanning } from '@/lib/plan';
import { calcRoutes } from '@/lib/algorithm';
import { buildStationMarkerKey } from '@/lib/planning';
import MapLegend from '@/components/MapLegend';
import { useToast } from '@/hooks/use-toast';

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

type RouteType = 'DEPARTURE_TO_SPOT' | 'SPOT_TO_SPOT' | 'SPOT_TO_DESTINATION' | 'TO_STATION' | 'STATION_TO_STATION';

type DisplayRoute = RouteResult & {
  routeType: RouteType;
};

const ROUTE_COLORS: Record<RouteType, string> = {
  DEPARTURE_TO_SPOT: '#34A853',
  SPOT_TO_SPOT: '#4285F4',
  SPOT_TO_DESTINATION: '#FF0000',
  TO_STATION: '#FACC15',
  STATION_TO_STATION: '#F97316',
};

const STATION_MARKER_COLOR = '#F59E0B';

const TravelMap = ({ date }: TravelMapProps) => {
  const fields = useStoreForPlanning();
  const { toast } = useToast();
  const allSpots = fields.getSpotInfo(date, TransportNodeType.SPOT);
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const [routes, setRoutes] = useState<DisplayRoute[]>([]);
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
  }, [date]);

  // ルート計算：マップロード後、または日付・スポット変化時に再計算する
  useEffect(() => {
    if (!map) return;

    const spots = fields.getSpotInfo(date, TransportNodeType.SPOT);
    const departure = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
    const destination = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);

    type RouteNode = {
      coord: Coordination;
      nearestStation?: PlanNearestStation;
      transportName: TravelModeType;
    };

    const nodes: RouteNode[] = [
      {
        coord: { id: 'departure', lat: departure.latitude, lng: departure.longitude, name: departure.name ?? '' },
        nearestStation: departure.nearestStation
          ? {
              ...departure.nearestStation,
              spotId: departure.nearestStation.spotId ?? '',
              placeId: departure.nearestStation.placeId ?? '',
              stationType: departure.nearestStation.stationType ?? 'TRAIN',
              name: departure.nearestStation.name ?? '',
              walkingTime: departure.nearestStation.walkingTime ?? 0,
              latitude: departure.nearestStation.latitude ?? 0,
              longitude: departure.nearestStation.longitude ?? 0,
            }
          : undefined,
        transportName: 'WALKING',
      },
      ...spots.map((spot) => ({
        coord: { id: spot.id, lat: spot.location.lat, lng: spot.location.lng, name: spot.location.name },
        nearestStation: spot.nearestStation
          ? {
              ...spot.nearestStation,
              spotId: spot.nearestStation.spotId ?? '',
              placeId: spot.nearestStation.placeId ?? '',
              stationType: spot.nearestStation.stationType ?? 'TRAIN',
              name: spot.nearestStation.name ?? '',
              walkingTime: spot.nearestStation.walkingTime ?? 0,
              latitude: spot.nearestStation.latitude ?? 0,
              longitude: spot.nearestStation.longitude ?? 0,
            }
          : undefined,
        transportName: (spot.transports?.name ?? 'WALKING') as TravelModeType,
      })),
      {
        coord: {
          id: 'destination',
          lat: destination.latitude,
          lng: destination.longitude,
          name: destination.name ?? '',
        },
        nearestStation: destination.nearestStation
          ? {
              ...destination.nearestStation,
              spotId: destination.nearestStation.spotId ?? '',
              placeId: destination.nearestStation.placeId ?? '',
              stationType: destination.nearestStation.stationType ?? 'TRAIN',
              name: destination.nearestStation.name ?? '',
              walkingTime: destination.nearestStation.walkingTime ?? 0,
              latitude: destination.nearestStation.latitude ?? 0,
              longitude: destination.nearestStation.longitude ?? 0,
            }
          : undefined,
        transportName: (destination.transports?.name ?? 'WALKING') as TravelModeType,
      },
    ];

    const totalSegments = nodes.length - 1;

    const buildAllRoutes = async () => {
      const newRoutes: DisplayRoute[] = [];

      for (let i = 0; i < totalSegments; i++) {
        const from = nodes[i];
        const to = nodes[i + 1];

        const directRouteType: RouteType =
          i === 0 ? 'DEPARTURE_TO_SPOT' : i === totalSegments - 1 ? 'SPOT_TO_DESTINATION' : 'SPOT_TO_SPOT';

        if (from.nearestStation && to.nearestStation) {
          // 最寄駅あり区間：徒歩→駅 と 駅→駅 に分割して描画する
          try {
            const toStation = await calcRoutes(
              { id: `node-${i}`, lat: from.coord.lat, lng: from.coord.lng, name: from.coord.name },
              {
                id: `st-from-${i}`,
                lat: from.nearestStation.latitude ?? 0,
                lng: from.nearestStation.longitude ?? 0,
                name: from.nearestStation.name ?? '',
              },
              'WALKING',
            );
            newRoutes.push({ ...toStation, routeType: 'TO_STATION' });
          } catch {
            toast({
              title: 'ルートの取得に失敗しました',
              description: 'ルートの取得に失敗しました。再度お試しください。',
              variant: 'destructive',
            });
          }

          try {
            const stationToStation = await calcRoutes(
              {
                id: `st-from-${i}`,
                lat: from.nearestStation.latitude ?? 0,
                lng: from.nearestStation.longitude ?? 0,
                name: from.nearestStation.name ?? '',
              },
              {
                id: `st-to-${i}`,
                lat: to.nearestStation.latitude ?? 0,
                lng: to.nearestStation.longitude ?? 0,
                name: to.nearestStation.name ?? '',
              },
              'WALKING',
            );
            newRoutes.push({ ...stationToStation, routeType: 'STATION_TO_STATION' });
          } catch {
            toast({
              title: 'ルートの取得に失敗しました',
              description: 'ルートの取得に失敗しました。再度お試しください。',
              variant: 'destructive',
            });
          }
        } else {
          // 最寄駅なし区間：直接ルートを描画する
          try {
            const direct = await calcRoutes(
              { id: `node-${i}`, lat: from.coord.lat, lng: from.coord.lng, name: from.coord.name },
              { id: `node-${i + 1}`, lat: to.coord.lat, lng: to.coord.lng, name: to.coord.name },
              to.transportName,
            );
            newRoutes.push({ ...direct, routeType: directRouteType });
          } catch {
            toast({
              title: 'ルートの取得に失敗しました',
              description: 'ルートの取得に失敗しました。再度お試しください。',
              variant: 'destructive',
            });
          }
        }
      }

      setRoutes(newRoutes);
    };

    buildAllRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, date]);

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
    path: 0, // デフォルトのマーカーを使用
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

  const stationMarkers = (() => {
    const allNearestStations = [
      departureData.nearestStation,
      ...allSpots.map((spot) => spot.nearestStation),
      destinationData.nearestStation,
    ].filter((station): station is NonNullable<typeof departureData.nearestStation> => Boolean(station));

    const uniqueStationMap = new Map<string, (typeof allNearestStations)[number]>();
    for (const station of allNearestStations) {
      const key = buildStationMarkerKey({
        placeId: station.placeId ?? '',
        lat: station.latitude ?? 0,
        lng: station.longitude ?? 0,
      });
      if (!uniqueStationMap.has(key)) {
        uniqueStationMap.set(key, station);
      }
    }

    return [...uniqueStationMap.values()];
  })();

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

        {/* 最寄駅のマーカー（同一 placeId は統合表示） */}
        {stationMarkers.map((station) => (
          <Marker
            key={buildStationMarkerKey({
              placeId: station.placeId ?? '',
              lat: station.latitude ?? 0,
              lng: station.longitude ?? 0,
            })}
            position={{ lat: station.latitude ?? 0, lng: station.longitude ?? 0 }}
            icon={createCustomMarker(STATION_MARKER_COLOR, '駅')}
            onClick={() =>
              setSelectedMarker({
                lat: station.latitude ?? 0,
                lng: station.longitude ?? 0,
                name: station.name ?? '',
              })
            }
          />
        ))}

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
              strokeColor: ROUTE_COLORS[route.routeType],
              strokeOpacity: 0.8,
              strokeWeight: route.routeType === 'TO_STATION' || route.routeType === 'STATION_TO_STATION' ? 3 : 2,
            }}
          />
        ))}
      </GoogleMap>
      <div className="mt-3">
        <MapLegend />
      </div>
    </div>
  );
};

export default TravelMap;
