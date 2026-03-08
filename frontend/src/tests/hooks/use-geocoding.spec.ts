import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useGeocoding, GeocodingResult } from '@/hooks/use-geocoding';

// Google Maps APIのモック - 各テスト前に再設定
let mockGeocodeFunction: ReturnType<typeof vi.fn>;

describe('useGeocoding', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 各テストで新しいモック関数を作成
    mockGeocodeFunction = vi.fn();

    vi.stubGlobal('google', {
      maps: {
        Geocoder: vi.fn(() => ({
          geocode: mockGeocodeFunction,
        })),
        GeocoderStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
          ERROR: 'ERROR',
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchByAddress', () => {
    it('住所から座標を取得できる', async () => {
      const mockResult = [
        {
          geometry: {
            location: {
              lat: () => 35.6812,
              lng: () => 139.7671,
            },
          },
          formatted_address: '東京都千代田区丸の内1丁目',
        },
      ];

      mockGeocodeFunction.mockImplementation(
        (
          request: google.maps.GeocoderRequest,
          callback: (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => void,
        ) => {
          callback(mockResult as unknown as google.maps.GeocoderResult[], 'OK' as google.maps.GeocoderStatus);
        },
      );

      const { result } = renderHook(() => useGeocoding());

      let geocodingResult: GeocodingResult | null = null;

      await act(async () => {
        geocodingResult = await result.current.searchByAddress('東京駅');
      });

      expect(geocodingResult).toEqual({
        latitude: 35.6812,
        longitude: 139.7671,
        formattedAddress: '東京都千代田区丸の内1丁目',
      });
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('空文字の場合は検索をスキップする', async () => {
      const { result } = renderHook(() => useGeocoding());

      let geocodingResult: GeocodingResult | null = null;

      await act(async () => {
        geocodingResult = await result.current.searchByAddress('');
      });

      expect(geocodingResult).toBeNull();
      expect(mockGeocodeFunction).not.toHaveBeenCalled();
    });

    it('同じ住所の場合は再検索をスキップする', async () => {
      const mockResult = [
        {
          geometry: {
            location: {
              lat: () => 35.6812,
              lng: () => 139.7671,
            },
          },
          formatted_address: '東京都千代田区丸の内1丁目',
        },
      ];

      mockGeocodeFunction.mockImplementation(
        (
          request: google.maps.GeocoderRequest,
          callback: (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => void,
        ) => {
          callback(mockResult as unknown as google.maps.GeocoderResult[], 'OK' as google.maps.GeocoderStatus);
        },
      );

      const { result } = renderHook(() => useGeocoding());

      // 1回目の検索
      await act(async () => {
        await result.current.searchByAddress('ユニーク住所A');
      });

      expect(mockGeocodeFunction).toHaveBeenCalledTimes(1);

      // 2回目の検索（同じ住所）- スキップされる
      let secondResult: GeocodingResult | null = null;
      await act(async () => {
        secondResult = await result.current.searchByAddress('ユニーク住所A');
      });

      // 同じ住所なので2回目は呼ばれない
      expect(mockGeocodeFunction).toHaveBeenCalledTimes(1);
      expect(secondResult).toBeNull();
    });

    it('住所が見つからない場合はエラーを設定する', async () => {
      mockGeocodeFunction.mockImplementation(
        (
          request: google.maps.GeocoderRequest,
          callback: (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => void,
        ) => {
          callback(null, 'ZERO_RESULTS' as google.maps.GeocoderStatus);
        },
      );

      const { result } = renderHook(() => useGeocoding());

      let geocodingResult: GeocodingResult | null = null;

      await act(async () => {
        geocodingResult = await result.current.searchByAddress('存在しない住所12345');
      });

      expect(geocodingResult).toBeNull();
      expect(result.current.error).toBe('住所が見つかりませんでした');
    });

    it('APIエラーの場合はエラーを設定する', async () => {
      mockGeocodeFunction.mockImplementation(
        (
          request: google.maps.GeocoderRequest,
          callback: (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => void,
        ) => {
          callback(null, 'ERROR' as google.maps.GeocoderStatus);
        },
      );

      const { result } = renderHook(() => useGeocoding());

      let geocodingResult: GeocodingResult | null = null;

      await act(async () => {
        geocodingResult = await result.current.searchByAddress('エラーテスト住所');
      });

      expect(geocodingResult).toBeNull();
      expect(result.current.error).toContain('住所の検索に失敗しました');
    });
  });

  describe('clearError', () => {
    it('エラーをクリアできる', async () => {
      mockGeocodeFunction.mockImplementation(
        (
          request: google.maps.GeocoderRequest,
          callback: (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => void,
        ) => {
          callback(null, 'ZERO_RESULTS' as google.maps.GeocoderStatus);
        },
      );

      const { result } = renderHook(() => useGeocoding());

      // エラーを発生させる
      await act(async () => {
        await result.current.searchByAddress('存在しない住所クリアテスト');
      });

      expect(result.current.error).not.toBeNull();

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('resetLastSearchedAddress', () => {
    it('最後に検索した住所をリセットできる', async () => {
      const mockResult = [
        {
          geometry: {
            location: {
              lat: () => 35.6812,
              lng: () => 139.7671,
            },
          },
          formatted_address: '東京都千代田区丸の内1丁目',
        },
      ];

      mockGeocodeFunction.mockImplementation(
        (
          request: google.maps.GeocoderRequest,
          callback: (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => void,
        ) => {
          callback(mockResult as unknown as google.maps.GeocoderResult[], 'OK' as google.maps.GeocoderStatus);
        },
      );

      const { result } = renderHook(() => useGeocoding());

      // 1回目の検索
      await act(async () => {
        await result.current.searchByAddress('ユニーク住所B');
      });

      expect(mockGeocodeFunction).toHaveBeenCalledTimes(1);

      // リセット
      act(() => {
        result.current.resetLastSearchedAddress();
      });

      // リセット後は同じ住所でも検索可能（キャッシュからは取得するのでAPIは呼ばれない）
      let geocodingResult: GeocodingResult | null = null;
      await act(async () => {
        geocodingResult = await result.current.searchByAddress('ユニーク住所B');
      });

      // キャッシュから取得されるので結果は返るがAPIは呼ばれない
      expect(geocodingResult).toEqual({
        latitude: 35.6812,
        longitude: 139.7671,
        formattedAddress: '東京都千代田区丸の内1丁目',
      });
    });
  });
});
