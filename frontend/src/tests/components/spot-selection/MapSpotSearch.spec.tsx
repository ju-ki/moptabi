import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MapSpotSearch from '@/components/spot-selection/MapSpotSearch';
import { useStoreForPlanning } from '@/lib/plan';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { ExtendPlanLocationType, ExtendSpotType, TravelPlanType } from '@/types/plan';

/**
 * 地図で探す（No.341）を検証する
 */

type MockMapProps = {
  children?: React.ReactNode;
  onLoad?: (map: google.maps.Map) => void;
  onClick?: (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => void;
  onDragEnd?: () => void;
};

type MockMarkerProps = {
  label?: string | google.maps.MarkerLabel;
  title?: string;
  onClick?: () => void;
  opacity?: number;
};

const { mapProps, mapInstance, mockSearchByAddress } = vi.hoisted(() => ({
  mapProps: { current: {} as MockMapProps },
  mapInstance: {
    panTo: vi.fn(),
    setZoom: vi.fn(),
    getCenter: vi.fn(() => ({ lat: () => 35.01, lng: () => 135.77 })),
  },
  mockSearchByAddress: vi.fn(),
}));

// 地図 SDK はテスト環境で実行できないため、props を取り出して操作できる部品に置き換える
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: (props: MockMapProps) => {
    mapProps.current = props;
    const { onLoad } = props;
    React.useEffect(() => {
      onLoad?.(mapInstance as unknown as google.maps.Map);
    }, [onLoad]);
    return <div data-testid="google-map">{props.children}</div>;
  },
  Marker: ({ label, title, onClick, opacity }: MockMarkerProps) => (
    <button
      type="button"
      data-testid="map-marker"
      data-label={typeof label === 'string' ? label : label?.text}
      data-opacity={opacity ?? 1}
      title={title}
      onClick={onClick}
    />
  ),
}));

// Geocoding API はテスト環境で呼べないため、結果を返すだけの関数に置き換える
vi.mock('@/hooks/use-geocoding', () => ({
  useGeocoding: () => ({ searchByAddress: mockSearchByAddress, isLoading: false, error: null }),
}));

const DATE = '2026-10-17';

const location = (name: string, lat: number, lng: number): ExtendPlanLocationType =>
  ({ name, latitude: lat, longitude: lng, time: '09:00', alternateRoutes: [] }) as unknown as ExtendPlanLocationType;

const createSpot = (overrides: Partial<ExtendSpotType> = {}): ExtendSpotType => ({
  id: 'kiyomizu',
  spotId: 'kiyomizu',
  name: '清水寺',
  latitude: 34.9949,
  longitude: 135.785,
  stayStart: '10:00',
  stayEnd: '11:00',
  stayDuration: 60,
  rating: 4.5,
  transportMethodId: 0,
  transportMethod: 'DEFAULT',
  travelTime: 0,
  order: 1,
  ...overrides,
});

const createPlan = (overrides: Partial<TravelPlanType> = {}): TravelPlanType => ({
  date: DATE,
  departure: location('京都駅', 34.9858, 135.7588),
  destination: location('京都タワー', 34.9875, 135.7593),
  spots: [
    createSpot(),
    createSpot({ id: 'inari', spotId: 'inari', name: '伏見稲荷大社', latitude: 34.9671, longitude: 135.7727 }),
  ],
  ...overrides,
});

const renderMap = (props: Partial<React.ComponentProps<typeof MapSpotSearch>> = {}) =>
  render(
    <MapSpotSearch
      date={DATE}
      selectedSpotIds={[]}
      onSpotSelect={vi.fn()}
      isLimitReached={false}
      limitsError={false}
      {...props}
    />,
  );

const candidateButton = (name: string) =>
  within(screen.getByRole('list', { name: '中心にする場所' })).getByRole('button', { name });

const markerLabels = () => screen.getAllByTestId('map-marker').map((marker) => marker.dataset.label);

describe('MapSpotSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStoreForPlanning.setState({ plans: [createPlan()] });
    useSpotSearchStore.setState({ mapCenter: null, mapCenterLabel: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('初期表示', () => {
    it('出発地・目的地・その日のスポットのピンを表示し、目的地を基準にすること', () => {
      renderMap();

      expect(markerLabels()).toEqual(['S', 'G', '1', '2']);
      expect(candidateButton('京都タワー (目的地)')).toHaveClass('border-primary');
    });

    it('出発地と目的地が同じ地点なら S/G のピン1つにまとめること', () => {
      useStoreForPlanning.setState({ plans: [createPlan({ destination: location('京都駅', 34.9858, 135.7588) })] });

      renderMap();

      expect(markerLabels()).toEqual(['S/G', '1', '2']);
    });

    it('開いただけでは位置情報を取得しないこと', () => {
      const getCurrentPosition = vi.fn();
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });

      renderMap();

      expect(getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  describe('中心の変更', () => {
    it('候補を押すと中心と基準名が変わり、ズーム 15 で移動すること', () => {
      renderMap();

      fireEvent.click(candidateButton('① 清水寺'));

      expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 34.9949, lng: 135.785 });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBe('① 清水寺');
      expect(mapInstance.panTo).toHaveBeenCalledWith({ lat: 34.9949, lng: 135.785 });
      expect(mapInstance.setZoom).toHaveBeenCalledWith(15);
    });

    it('住所を入力して Enter を押すと、その地点に移動し基準名は「中心」になること', async () => {
      mockSearchByAddress.mockResolvedValue({ latitude: 41.7687, longitude: 140.7288, formattedAddress: '函館市元町' });
      renderMap();

      const input = screen.getByTestId('address-search-input');
      fireEvent.change(input, { target: { value: '函館市元町' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 41.7687, lng: 140.7288 });
      });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBeNull();
      expect(mapInstance.panTo).toHaveBeenCalledWith({ lat: 41.7687, lng: 140.7288 });
    });

    it('「現在地」を押すと位置情報を取得して移動すること', () => {
      const getCurrentPosition = vi.fn((success: PositionCallback) =>
        success({ coords: { latitude: 35.1, longitude: 135.2 } } as GeolocationPosition),
      );
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
      renderMap();

      fireEvent.click(candidateButton('現在地'));

      expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 35.1, lng: 135.2 });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBe('現在地');
    });

    it('位置情報の取得に失敗したらエラーを出し、中心は動かさないこと', () => {
      const getCurrentPosition = vi.fn((_: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1 } as GeolocationPositionError),
      );
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
      renderMap();

      fireEvent.click(candidateButton('現在地'));

      expect(screen.getByText(/現在地を取得できませんでした/)).toBeInTheDocument();
      expect(useSpotSearchStore.getState().mapCenter).toBeNull();
    });

    it('地図をドラッグすると地図の中心を中心にし、基準名は「中心」になること', () => {
      renderMap();

      act(() => mapProps.current.onDragEnd?.());

      expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 35.01, lng: 135.77 });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBeNull();
    });
  });
});
