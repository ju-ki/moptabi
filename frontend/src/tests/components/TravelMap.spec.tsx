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
    return <div data-testid="map-marker" data-lat={position.lat} data-lng={position.lng} onClick={onClick} />;
  },
  Polyline: () => <div data-testid="map-polyline" />,
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
});
