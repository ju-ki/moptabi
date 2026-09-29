import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useCurrentLocation } from '@/hooks/spot-search/use-current-location';

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

describe('useCurrentLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('位置情報の取得に成功した場合', () => {
    it('currentLocation に取得した座標がセットされる', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({ coords: { latitude: 35.6812, longitude: 139.7671 } });
      });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.currentLocation).toEqual({
          id: 'current-location',
          name: '現在地',
          lat: 35.6812,
          lng: 139.7671,
        });
      });
    });

    it('取得完了後 isLocating が false になる', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({ coords: { latitude: 35.0, longitude: 135.0 } });
      });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.isLocating).toBe(false);
      });
    });

    it('error は null のまま', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({ coords: { latitude: 35.0, longitude: 135.0 } });
      });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('ユーザーが位置情報を拒否した場合', () => {
    it('error に失敗メッセージがセットされる', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_success, failure) => {
        failure(new Error('User denied'));
      });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.error).toBe('位置情報の取得に失敗しました');
      });
    });

    it('currentLocation は null のまま', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_success, failure) => {
        failure(new Error('User denied'));
      });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.currentLocation).toBeNull();
      });
    });

    it('isLocating が false になる', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_success, failure) => {
        failure(new Error('User denied'));
      });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.isLocating).toBe(false);
      });
    });
  });

  describe('ブラウザが Geolocation API をサポートしていない場合', () => {
    it('error に非対応メッセージがセットされる', async () => {
      vi.stubGlobal('navigator', { geolocation: undefined });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.error).toBe('このブラウザは位置情報をサポートしていません');
      });
    });

    it('isLocating は false のまま', async () => {
      vi.stubGlobal('navigator', { geolocation: undefined });

      const { result } = renderHook(() => useCurrentLocation());

      await waitFor(() => {
        expect(result.current.isLocating).toBe(false);
      });
    });
  });
});
