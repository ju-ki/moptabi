import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * TravelMap テスト
 * Google Maps APIのモック化が必要なため @react-google-maps/api を差し替えて
 * ストア状態に応じたマーカー表示ロジックを検証する
 *
 * モック化の理由:
 * - @react-google-maps/api はブラウザの google.maps オブジェクトに依存しており、
 *   jsdom 環境では動作しないためモック化が必要
 */

// google.maps のグローバルオブジェクトをモック化する（@react-google-maps/api 依存）
const mockMap = {
  controls: {
    [2]: { push: vi.fn(), getArray: vi.fn().mockReturnValue([]), removeAt: vi.fn() },
  },
  fitBounds: vi.fn(),
};
vi.stubGlobal('google', {
  maps: {
    LatLngBounds: vi.fn(() => ({ extend: vi.fn() })),
    ControlPosition: { TOP_RIGHT: 2 },
    SymbolPath: { CIRCLE: 0, BACKWARD_CLOSED_ARROW: 3, FORWARD_OPEN_ARROW: 1 },
  },
});

let capturedOnLoad: ((map: any) => void) | undefined;

vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children, onLoad }: { children?: React.ReactNode; onLoad?: (map: any) => void }) => {
    capturedOnLoad = onLoad;
    return <div data-testid="google-map">{children}</div>;
  },
  Marker: ({
    position,
    onClick,
    icon,
  }: {
    position: { lat: number; lng: number };
    onClick?: () => void;
    icon?: any;
  }) => {
    return (
      <div
        data-testid="map-marker"
        data-lat={position.lat}
        data-lng={position.lng}
        data-color={icon?.fillColor || ''}
        onClick={onClick}
      />
    );
  },
  Polyline: ({ options }: { options?: { strokeColor?: string } }) => (
    <div data-testid="map-polyline" data-stroke-color={options?.strokeColor || ''} />
  ),
  InfoWindow: ({ children, onCloseClick }: { children?: React.ReactNode; onCloseClick?: () => void }) => (
    <div data-testid="info-window">
      {children}
      <button onClick={onCloseClick}>閉じる</button>
    </div>
  ),
}));

// DistanceInfo は TravelMap の子コンポーネントのためモック化する
vi.mock('@/components/DistanceInfo', () => ({
  default: () => <div data-testid="distance-info" />,
}));

// calcRoutes は非同期ルート計算のためモック化する
vi.mock('@/lib/algorithm', () => ({
  calcRoutes: vi.fn().mockResolvedValue({
    travelMode: 'WALKING',
    duration: '10分',
    distance: '1km',
    path: [],
  }),
}));

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

import { useStoreForPlanning } from '@/lib/plan';
import { calcRoutes } from '@/lib/algorithm';
import TravelMap from '@/components/TravelMap';
import { TransportNodeType } from '@/types/plan';

const defaultDeparture = {
  name: '東京駅',
  latitude: 35.6813,
  longitude: 139.7671,
  address: null,
  label: null,
  locationType: 'DEPARTURE' as const,
  isDefault: false,
  usageCount: 0,
  userLocationId: null,
  planName: null,
  planLocationId: null,
  transports: undefined,
};

const defaultDestination = {
  ...defaultDeparture,
  name: '浅草',
  latitude: 35.7148,
  longitude: 139.7967,
  locationType: 'DESTINATION' as const,
};

const createMockSpot = (id: string, name: string) => ({
  id,
  location: { id, name, lat: 35.6895, lng: 139.6917 },
  stayStart: '09:00',
  stayEnd: '11:00',
  memo: null,
  order: 0,
  transports: {
    transportMethod: 1,
    name: 'WALKING',
    travelTime: '30分',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  nearestStation: undefined,
});

const createMockFields = (spots: ReturnType<typeof createMockSpot>[] = [], overrides: any = {}) => ({
  getSpotInfo: vi.fn().mockReturnValue(spots),
  getDepartureAndDestination: vi.fn((date: string, type: TransportNodeType) => {
    if (type === TransportNodeType.DEPARTURE) return defaultDeparture;
    return defaultDestination;
  }),
  getSpotCoordination: vi.fn().mockReturnValue({
    spotCoordination: spots.map((s) => ({
      id: s.id,
      location: { lat: s.location.lat, lng: s.location.lng, name: s.location.name },
    })),
  }),
  getTripInfo: vi.fn().mockReturnValue({ transportationMethod: 1 }),
  setDepartureAndDestination: vi.fn(),
  editSpots: vi.fn(),
  plans: [],
  ...overrides,
});

describe('TravelMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('マーカー表示', () => {
    it('出発地・目的地のマーカーが表示されること', async () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields([]));

      render(<TravelMap date="2025-12-20" />);

      // GoogleMap がレンダリングされる
      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });

    it('スポットがある場合マーカーが表示されること', async () => {
      const spots = [createMockSpot('spot-1', '東京タワー'), createMockSpot('spot-2', '浅草寺')];
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      render(<TravelMap date="2025-12-20" />);

      const markers = screen.getAllByTestId('map-marker');
      // 出発地 + 目的地 + スポット数
      expect(markers.length).toBe(4);
    });

    it('スポットがない場合も地図が表示されること', async () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields([]));

      render(<TravelMap date="2025-12-20" />);

      expect(screen.getByTestId('google-map')).toBeInTheDocument();
      expect(screen.getAllByTestId('map-marker')).toHaveLength(2);
    });

    it('スポットがある場合にルートのポリラインが表示されること', async () => {
      const spots = [createMockSpot('spot-1', '東京タワー'), createMockSpot('spot-2', '浅草寺')];
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      render(<TravelMap date="2025-12-20" />);

      act(() => {
        capturedOnLoad?.(mockMap as any);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId('map-polyline')).toHaveLength(3);
      });

      expect(calcRoutes).toHaveBeenCalledTimes(3);
    });

    // SPEC: PC-TM-001
    it('最寄駅あり区間で TO_STATION と STATION_TO_STATION のルートを描画する', async () => {
      const spots = [
        {
          ...createMockSpot('spot-1', '東京タワー'),
          nearestStation: {
            placeId: 'st-a',
            name: '赤羽橋駅',
            walkingTime: 4,
            latitude: 35.655,
            longitude: 139.745,
          },
        },
        {
          ...createMockSpot('spot-2', '浅草寺'),
          nearestStation: {
            placeId: 'st-b',
            name: '浅草駅',
            walkingTime: 5,
            latitude: 35.711,
            longitude: 139.797,
          },
        },
      ];

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields(spots as any, {
          getDepartureAndDestination: vi.fn((date: string, type: TransportNodeType) => {
            if (type === TransportNodeType.DEPARTURE) {
              return {
                ...defaultDeparture,
                nearestStation: {
                  placeId: 'st-dep',
                  name: '東京駅',
                  walkingTime: 3,
                  latitude: 35.6812,
                  longitude: 139.7671,
                },
              };
            }
            return {
              ...defaultDestination,
              nearestStation: {
                placeId: 'st-dst',
                name: '浅草駅',
                walkingTime: 4,
                latitude: 35.712,
                longitude: 139.796,
              },
            };
          }),
        }),
      );

      render(<TravelMap date="2025-12-20" />);

      act(() => {
        capturedOnLoad?.(mockMap as any);
      });

      await waitFor(() => {
        const polylines = screen.getAllByTestId('map-polyline');
        expect(polylines.length).toBeGreaterThan(0);
      });

      const strokeColors = screen.getAllByTestId('map-polyline').map((line) => line.getAttribute('data-stroke-color'));
      expect(strokeColors).toContain('#FACC15');
      expect(strokeColors).toContain('#F97316');
    });

    // SPEC: PC-TM-002
    it('同一placeIdの最寄駅マーカーを1つだけ表示する', async () => {
      const sharedStation = {
        placeId: 'shared-station',
        name: '上野駅',
        walkingTime: 5,
        latitude: 35.713,
        longitude: 139.777,
      };

      const spots = [
        {
          ...createMockSpot('spot-1', '東京タワー'),
          nearestStation: sharedStation,
        },
        {
          ...createMockSpot('spot-2', '浅草寺'),
          nearestStation: sharedStation,
        },
      ];

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields(spots as any, {
          getDepartureAndDestination: vi.fn((date: string, type: TransportNodeType) => {
            if (type === TransportNodeType.DEPARTURE) return defaultDeparture;
            return defaultDestination;
          }),
        }),
      );

      render(<TravelMap date="2025-12-20" />);

      const stationMarkers = screen
        .getAllByTestId('map-marker')
        .filter((marker) => marker.getAttribute('data-color') === '#F59E0B');

      expect(stationMarkers).toHaveLength(1);
    });
  });

  describe('マーカークリック', () => {
    it('出発地マーカーをクリックするとInfoWindowが表示されること', async () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields([]));

      render(<TravelMap date="2025-12-20" />);

      const markers = screen.getAllByTestId('map-marker');
      // 最初のマーカー（出発地）をクリック
      fireEvent.click(markers[0]);

      await waitFor(() => {
        expect(screen.getByTestId('info-window')).toBeInTheDocument();
      });
    });

    it('InfoWindow の閉じる操作で非表示になること', async () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields([]));

      render(<TravelMap date="2025-12-20" />);

      const markers = screen.getAllByTestId('map-marker');
      fireEvent.click(markers[0]);

      await waitFor(() => {
        expect(screen.getByTestId('info-window')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '閉じる' }));

      await waitFor(() => {
        expect(screen.queryByTestId('info-window')).not.toBeInTheDocument();
      });
    });
  });

  describe('複数日対応', () => {
    it('日付が変更されるとルートが再計算されること', async () => {
      const spots = [createMockSpot('spot-1', '東京タワー'), createMockSpot('spot-2', '浅草寺')];
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      const { rerender } = render(<TravelMap date="2025-12-20" />);

      act(() => {
        capturedOnLoad?.(mockMap as any);
      });

      await waitFor(() => {
        expect(calcRoutes).toHaveBeenCalledTimes(3);
      });

      // 日付を変更して再レンダリング
      vi.clearAllMocks();
      rerender(<TravelMap date="2025-12-21" />);

      act(() => {
        capturedOnLoad?.(mockMap as any);
      });

      await waitFor(() => {
        // 2日目も3本のルートが計算される（出発地→スポット1→スポット2→目的地 = 3セグメント）
        expect(calcRoutes).toHaveBeenCalledTimes(3);
      });
    });

    it('複数日プランで異なるスポット数のマーカーが表示される', async () => {
      const spotsDay1 = [createMockSpot('spot-1', '東京タワー')];
      const spotsDay2 = [createMockSpot('spot-a', '浅草寺'), createMockSpot('spot-b', '上野公園')];

      const mockStoreWithMultipleDays = {
        getSpotInfo: vi
          .fn()
          .mockImplementation((date: string) =>
            date === '2025-12-20' ? spotsDay1 : date === '2025-12-21' ? spotsDay2 : [],
          ),
        getDepartureAndDestination: vi.fn((date: string, type: TransportNodeType) => {
          if (type === TransportNodeType.DEPARTURE) return defaultDeparture;
          return defaultDestination;
        }),
        getSpotCoordination: vi.fn().mockImplementation((date: string) => ({
          spotCoordination:
            date === '2025-12-20'
              ? spotsDay1.map((s) => ({
                  id: s.id,
                  location: { lat: s.location.lat, lng: s.location.lng, name: s.location.name },
                }))
              : spotsDay2.map((s) => ({
                  id: s.id,
                  location: { lat: s.location.lat, lng: s.location.lng, name: s.location.name },
                })),
        })),
        getTripInfo: vi.fn().mockReturnValue({ transportationMethod: 1 }),
        setDepartureAndDestination: vi.fn(),
        editSpots: vi.fn(),
        plans: [],
      };

      (useStoreForPlanning as any).mockReturnValue(mockStoreWithMultipleDays);

      const { rerender } = render(<TravelMap date="2025-12-20" />);

      // 1日目：出発地 + スポット1 + 目的地 = 3マーカー
      expect(screen.getAllByTestId('map-marker')).toHaveLength(3);

      // 2日目に変更
      rerender(<TravelMap date="2025-12-21" />);

      // 2日目：出発地 + スポット2 + 目的地 = 4マーカー
      expect(screen.getAllByTestId('map-marker')).toHaveLength(4);
    });

    it('複数日でも日付ごとに独立した出発地・目的地が表示される', async () => {
      const departureDay1 = {
        ...defaultDeparture,
        name: '新宿駅',
        latitude: 35.6895,
        longitude: 139.7037,
      };

      const departureDay2 = {
        ...defaultDeparture,
        name: '東京駅',
        latitude: 35.6762,
        longitude: 139.7674,
      };

      const mockStoreMultipleDepartures = {
        getSpotInfo: vi.fn().mockReturnValue([]),
        getDepartureAndDestination: vi.fn().mockImplementation((date: string, type: TransportNodeType) => {
          if (type === TransportNodeType.DEPARTURE) {
            return date === '2025-12-20' ? departureDay1 : departureDay2;
          }
          return defaultDestination;
        }),
        getSpotCoordination: vi.fn().mockReturnValue({ spotCoordination: [] }),
        getTripInfo: vi.fn().mockReturnValue({ transportationMethod: 1 }),
        setDepartureAndDestination: vi.fn(),
        editSpots: vi.fn(),
        plans: [],
      };

      (useStoreForPlanning as any).mockReturnValue(mockStoreMultipleDepartures);

      const { rerender } = render(<TravelMap date="2025-12-20" />);

      let markers = screen.getAllByTestId('map-marker');
      // 1日目の出発地マーカーの緯度経度を確認
      expect(markers[0].getAttribute('data-lat')).toBe(String(departureDay1.latitude));
      expect(markers[0].getAttribute('data-lng')).toBe(String(departureDay1.longitude));

      // 2日目に変更
      rerender(<TravelMap date="2025-12-21" />);

      markers = screen.getAllByTestId('map-marker');
      // 2日目の出発地マーカーの緯度経度を確認
      expect(markers[0].getAttribute('data-lat')).toBe(String(departureDay2.latitude));
      expect(markers[0].getAttribute('data-lng')).toBe(String(departureDay2.longitude));
    });
  });
});
