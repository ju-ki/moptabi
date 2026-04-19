import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useGoogleMap } from '@/hooks/use-google';

/**
 * use-google テスト
 * Google Maps の状態管理ロジックを検証する
 */

// navigator.geolocation をモック化する（jsdomではサポートされていないため）
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('useGoogleMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態でmapはnullであること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      expect(result.current.map).toBeNull();
    });

    it('初期mapCoordinateが東京駅の座標であること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      // defaultLocationは東京駅（35.6812, 139.7671）
      expect(result.current.mapCoordinate).toBeDefined();
      expect(typeof result.current.mapCoordinate.lat).toBe('number');
      expect(typeof result.current.mapCoordinate.lng).toBe('number');
    });

    it('初期状態でselectedSpotはnullであること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      expect(result.current.selectedSpot).toBeNull();
    });
  });

  describe('マップのロード・アンロード', () => {
    it('onLoadを呼ぶとmapインスタンスが設定されること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      const mockMapInstance = {} as google.maps.Map;

      act(() => {
        result.current.onLoad(mockMapInstance);
      });

      expect(result.current.map).toBe(mockMapInstance);
    });

    it('onUnmountを呼ぶとmapがnullになること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      const mockMapInstance = {} as google.maps.Map;

      act(() => {
        result.current.onLoad(mockMapInstance);
      });

      act(() => {
        result.current.onUnmount();
      });

      expect(result.current.map).toBeNull();
    });
  });

  describe('マップクリック', () => {
    it('handleMapClickを呼ぶとmapCoordinateが更新されること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      const mockEvent = {
        latLng: {
          lat: () => 35.6586,
          lng: () => 139.7454,
        },
      } as google.maps.MapMouseEvent;

      act(() => {
        result.current.handleMapClick(mockEvent);
      });

      expect(result.current.mapCoordinate.lat).toBe(35.6586);
      expect(result.current.mapCoordinate.lng).toBe(139.7454);
    });

    it('latLngがnullの場合はmapCoordinateが更新されないこと', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      const initialCoordinate = result.current.mapCoordinate;

      const mockEvent = { latLng: null } as google.maps.MapMouseEvent;

      act(() => {
        result.current.handleMapClick(mockEvent);
      });

      expect(result.current.mapCoordinate).toEqual(initialCoordinate);
    });
  });

  describe('selectedSpotの管理', () => {
    it('setSelectedSpotで選択スポットを設定できること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      const mockSpot = {
        id: 'spot-1',
        location: { id: 'spot-1', name: '東京タワー', lat: 35.6586, lng: 139.7454 },
      } as any;

      act(() => {
        result.current.setSelectedSpot(mockSpot);
      });

      expect(result.current.selectedSpot).toBe(mockSpot);
    });

    it('setSelectedSpot(null)でselectedSpotをクリアできること', () => {
      const { result } = renderHook(() => useGoogleMap(false));

      const mockSpot = {
        id: 'spot-1',
        location: { id: 'spot-1', name: '東京タワー', lat: 35.6586, lng: 139.7454 },
      } as any;

      act(() => {
        result.current.setSelectedSpot(mockSpot);
      });

      act(() => {
        result.current.setSelectedSpot(null);
      });

      expect(result.current.selectedSpot).toBeNull();
    });
  });

  describe('extraCoordinateの適用', () => {
    it('extraCoordinateが提供された場合、mapCoordinateが更新されること', () => {
      const extraCoordinate = { id: 'kyoto', lat: 35.0116, lng: 135.7681, name: '京都' };

      const { result } = renderHook(() => useGoogleMap(false, extraCoordinate));

      expect(result.current.mapCoordinate.lat).toBe(35.0116);
      expect(result.current.mapCoordinate.lng).toBe(135.7681);
    });
  });

  describe('現在地取得', () => {
    it('isSetCurrentLocationがtrueの場合はgeolocationが呼ばれること', () => {
      mockGeolocation.getCurrentPosition.mockImplementation((callback) => {
        callback({
          coords: { latitude: 35.7148, longitude: 139.7967 },
        });
      });

      renderHook(() => useGoogleMap(true));

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('isSetCurrentLocationがfalseの場合はgeolocationが呼ばれないこと', () => {
      renderHook(() => useGoogleMap(false));

      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });
  });
});
