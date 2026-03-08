import { useState, useCallback, useRef } from 'react';

/**
 * Geocoding結果の型定義
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * キャッシュエントリの型定義
 */
interface CacheEntry {
  result: GeocodingResult;
  timestamp: number;
}

// キャッシュの有効期限（5分）
const CACHE_DURATION_MS = 5 * 60 * 1000;

// グローバルキャッシュ（コンポーネント間で共有）
const geocodingCache = new Map<string, CacheEntry>();

/**
 * 住所から緯度・経度を取得するカスタムフック
 *
 * @description
 * - Google Geocoding APIを使用して住所から座標を取得
 * - 検索結果は一定時間キャッシュとして保存
 * - 同じ住所の場合は検索をスキップ
 */
export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSearchedAddress = useRef<string>('');

  /**
   * キャッシュから結果を取得
   */
  const getFromCache = useCallback((address: string): GeocodingResult | null => {
    const entry = geocodingCache.get(address);
    if (!entry) return null;

    // キャッシュが有効期限内かチェック
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      geocodingCache.delete(address);
      return null;
    }

    return entry.result;
  }, []);

  /**
   * キャッシュに結果を保存
   */
  const setToCache = useCallback((address: string, result: GeocodingResult) => {
    geocodingCache.set(address, {
      result,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * 住所から座標を検索
   *
   * @param address 検索する住所
   * @returns Geocoding結果（失敗時はnull）
   */
  const searchByAddress = useCallback(
    async (address: string): Promise<GeocodingResult | null> => {
      // 空文字の場合はスキップ
      if (!address.trim()) {
        setError(null);
        return null;
      }

      // 入力内容が変わっていない場合はスキップ
      if (address === lastSearchedAddress.current) {
        return null;
      }

      // キャッシュをチェック
      const cachedResult = getFromCache(address);
      if (cachedResult) {
        lastSearchedAddress.current = address;
        setError(null);
        return cachedResult;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Google Geocoding APIを使用
        const geocoder = new google.maps.Geocoder();

        const response = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ address }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
              resolve(results);
            } else if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
              reject(new Error('住所が見つかりませんでした'));
            } else {
              reject(new Error(`住所の検索に失敗しました: ${status}`));
            }
          });
        });

        const location = response[0].geometry.location;
        const result: GeocodingResult = {
          latitude: location.lat(),
          longitude: location.lng(),
          formattedAddress: response[0].formatted_address,
        };

        // キャッシュに保存
        setToCache(address, result);
        lastSearchedAddress.current = address;

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '住所の検索に失敗しました';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getFromCache, setToCache],
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 最後に検索した住所をリセット
   */
  const resetLastSearchedAddress = useCallback(() => {
    lastSearchedAddress.current = '';
  }, []);

  return {
    isLoading,
    error,
    searchByAddress,
    clearError,
    resetLastSearchedAddress,
  };
}
