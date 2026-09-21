/**
 * place-fetcher.ts のユニットテスト
 *
 * Google Maps Platform 利用規約への準拠を検証する。
 * 規約で許可されたデータのみ localStorage に保存されていることを確認する。
 *   - 許可: latitude / longitude（30日間）
 *   - 禁止: name / address / rating 等の詳細情報
 */

// モックの理由:
// 1. google.maps.places.Place はブラウザの Maps JavaScript API に依存しており、
//    テスト環境（jsdom）では利用できないため、fetchPlaceById と convertPlaceToSpotMeta をモック。
// 2. localStorage はテスト環境（jsdom）の実装が不安定（.clear() 未実装）なため、
//    信頼性のある独自モックを使用する。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  fetchPlaceDetailsWithRetry,
  cleanExpiredPlaceCache,
  clearMemoryCache,
  getCachedCoordinates,
} from '@/lib/place-fetcher';

// google-maps モジュール全体をモック
vi.mock('@/lib/google-maps', () => ({
  fetchPlaceById: vi.fn(),
  convertPlaceToSpotMeta: vi.fn(),
}));

import { fetchPlaceById, convertPlaceToSpotMeta } from '@/lib/google-maps';
const mockFetchPlaceById = vi.mocked(fetchPlaceById);
const mockConvertPlaceToSpotMeta = vi.mocked(convertPlaceToSpotMeta);

// localStorage モック（jsdom の実装が不安定なため独自実装を使用）
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    _getStore: () => ({ ...store }),
  };
}

const PLACE_ID = 'ChIJtest123';
const MOCK_PLACE = {} as google.maps.places.Place;
const MOCK_META = {
  spotId: PLACE_ID,
  name: '東京タワー',
  latitude: 35.6585,
  longitude: 139.7454,
  address: '東京都港区芝公園4丁目2-8',
  rating: 4.5,
  categories: ['tourist_attraction'],
  prefecture: '東京都',
};

describe('fetchPlaceDetailsWithRetry', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    clearMemoryCache();
    vi.clearAllMocks();
    mockFetchPlaceById.mockResolvedValue(MOCK_PLACE);
    mockConvertPlaceToSpotMeta.mockReturnValue(MOCK_META);
  });

  afterEach(() => {
    localStorageMock.clear();
    clearMemoryCache();
    vi.unstubAllGlobals();
  });

  describe('API 取得と返却値', () => {
    it('APIからスポット詳細を取得して返すこと', async () => {
      const result = await fetchPlaceDetailsWithRetry(PLACE_ID);

      expect(result.hasError).toBe(false);
      expect(result.data).toEqual(MOCK_META);
      expect(result.data?.name).toBe('東京タワー');
      expect(result.data?.latitude).toBe(35.6585);
    });
  });

  describe('規約準拠のキャッシュ動作', () => {
    it('localStorage には lat/lng のみ保存されること（name や address は保存しない）', async () => {
      await fetchPlaceDetailsWithRetry(PLACE_ID);

      // localStorage に保存されたキーを確認
      const store = localStorageMock._getStore();
      const keys = Object.keys(store);
      const placeCacheKeys = keys.filter((k) => k.includes(PLACE_ID));
      expect(placeCacheKeys).toHaveLength(1);

      const saved = JSON.parse(store[placeCacheKeys[0]]);

      // lat/lng は保存されている
      expect(saved.lat).toBe(35.6585);
      expect(saved.lng).toBe(139.7454);
      expect(saved.cachedAt).toBeTypeOf('number');

      // 詳細情報は localStorage に含まれていない
      expect(saved.name).toBeUndefined();
      expect(saved.address).toBeUndefined();
      expect(saved.rating).toBeUndefined();
      expect(saved.categories).toBeUndefined();
      expect(saved.data).toBeUndefined();
    });

    it('localStorage のキープレフィックスが place_latlng_ であること', async () => {
      await fetchPlaceDetailsWithRetry(PLACE_ID);

      const store = localStorageMock._getStore();
      const keys = Object.keys(store);
      const latlngKeys = keys.filter((k) => k.startsWith('place_latlng_'));
      expect(latlngKeys).toHaveLength(1);
      expect(latlngKeys[0]).toBe(`place_latlng_${PLACE_ID}`);

      // 旧形式（place_cache_*）のキーは作られていない
      const legacyKeys = keys.filter((k) => k.startsWith('place_cache_'));
      expect(legacyKeys).toHaveLength(0);
    });

    it('2回目の呼び出しではメモリキャッシュを利用してAPIを呼び出さないこと', async () => {
      await fetchPlaceDetailsWithRetry(PLACE_ID);
      await fetchPlaceDetailsWithRetry(PLACE_ID);

      // API は1回しか呼ばれない
      expect(mockFetchPlaceById).toHaveBeenCalledTimes(1);
    });

    it('ページリロード相当（メモリキャッシュクリア後）は再度APIを呼び出すこと', async () => {
      await fetchPlaceDetailsWithRetry(PLACE_ID);
      clearMemoryCache(); // ページリロード相当

      await fetchPlaceDetailsWithRetry(PLACE_ID);

      // メモリキャッシュがないため2回APIが呼ばれる
      expect(mockFetchPlaceById).toHaveBeenCalledTimes(2);
    });
  });

  describe('リトライ動作', () => {
    it('API失敗時に最大3回リトライすること', async () => {
      vi.useFakeTimers();
      mockFetchPlaceById.mockRejectedValue(new Error('Network error'));

      const promise = fetchPlaceDetailsWithRetry(PLACE_ID);
      // リトライ間隔を進める（1000ms, 2000ms）
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.hasError).toBe(true);
      expect(mockFetchPlaceById).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it('3回失敗後にエラーメッセージを返すこと', async () => {
      vi.useFakeTimers();
      mockFetchPlaceById.mockRejectedValue(new Error('API制限エラー'));

      const promise = fetchPlaceDetailsWithRetry(PLACE_ID);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.hasError).toBe(true);
      expect(result.data).toBeNull();
      expect(result.errorMessage).toBe('API制限エラー');
      vi.useRealTimers();
    });

    it('1回失敗した後に成功した場合は正常に返すこと', async () => {
      vi.useFakeTimers();
      mockFetchPlaceById.mockRejectedValueOnce(new Error('一時エラー')).mockResolvedValueOnce(MOCK_PLACE);

      const promise = fetchPlaceDetailsWithRetry(PLACE_ID);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.hasError).toBe(false);
      expect(result.data).toEqual(MOCK_META);
      expect(mockFetchPlaceById).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });
});

describe('cleanExpiredPlaceCache', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    clearMemoryCache();
  });

  afterEach(() => {
    localStorageMock.clear();
    clearMemoryCache();
    vi.unstubAllGlobals();
  });

  it('有効期限内のエントリは削除しないこと', () => {
    const validEntry = JSON.stringify({ lat: 35.0, lng: 139.0, cachedAt: Date.now() });
    localStorageMock.setItem('place_latlng_valid', validEntry);

    cleanExpiredPlaceCache();

    expect(localStorageMock.getItem('place_latlng_valid')).not.toBeNull();
  });

  it('期限切れ（30日超）のエントリを削除すること', () => {
    const expiredAt = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31日前
    const expiredEntry = JSON.stringify({ lat: 35.0, lng: 139.0, cachedAt: expiredAt });
    localStorageMock.setItem('place_latlng_expired', expiredEntry);

    cleanExpiredPlaceCache();

    expect(localStorageMock.getItem('place_latlng_expired')).toBeNull();
  });

  it('旧形式（place_cache_*）のエントリを無条件で削除すること', () => {
    // 旧バージョンが保存した全詳細情報を含むキャッシュ（規約違反データ）
    const legacyEntry = JSON.stringify({
      data: { name: '東京タワー', latitude: 35.0, longitude: 139.0 },
      cachedAt: Date.now(),
    });
    localStorageMock.setItem('place_cache_legacy', legacyEntry);

    cleanExpiredPlaceCache();

    expect(localStorageMock.getItem('place_cache_legacy')).toBeNull();
  });

  it('他のキーには影響しないこと', () => {
    localStorageMock.setItem('other_key', 'some_value');
    cleanExpiredPlaceCache();
    expect(localStorageMock.getItem('other_key')).toBe('some_value');
  });
});

describe('getCachedCoordinates', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    clearMemoryCache();
    vi.clearAllMocks();
    mockFetchPlaceById.mockResolvedValue(MOCK_PLACE);
    mockConvertPlaceToSpotMeta.mockReturnValue(MOCK_META);
  });

  afterEach(() => {
    localStorageMock.clear();
    clearMemoryCache();
    vi.unstubAllGlobals();
  });

  it('APIで取得後、lat/lng がキャッシュされていること', async () => {
    await fetchPlaceDetailsWithRetry(PLACE_ID);

    const coords = getCachedCoordinates(PLACE_ID);
    expect(coords).not.toBeNull();
    expect(coords?.lat).toBe(35.6585);
    expect(coords?.lng).toBe(139.7454);
  });

  it('未取得の placeId では null を返すこと', () => {
    const coords = getCachedCoordinates('unknown_id');
    expect(coords).toBeNull();
  });
});
