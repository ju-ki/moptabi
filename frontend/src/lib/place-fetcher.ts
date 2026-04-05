/**
 * Google Maps Place Details 取得ユーティリティ
 *
 * ## キャッシュ戦略（Google Maps Platform 利用規約準拠）
 *
 * Google Maps Platform 利用規約では、Places API から取得したデータの永続キャッシュは
 * 以下のみ許可されている:
 *   - place_id: キャッシュキーとして使用（規約 Section A.3）
 *   - latitude / longitude: 30日間のみ（規約 Section 10.3）
 *
 * name・address・rating・categories 等の詳細情報は永続ストレージへの保存が禁止されている。
 *
 * ### 本実装のキャッシュ方法:
 * | データ | キャッシュ先 | 有効期間 |
 * |--------|------------|---------|
 * | lat / lng | localStorage (place_latlng_ prefix) | 30日間 |
 * | スポット詳細全体 | モジュールスコープの Map（メモリ） | セッション中 |
 *
 * - API 取得失敗時は最大 3 回リトライする
 * - 取得失敗時はエラー状態を返す
 */
import { SpotMetaType } from '@/types/spot';

import { convertPlaceToSpotMeta, fetchPlaceById } from './google-maps';

/** lat/lng のローカルストレージキャッシュに使うプレフィックス */
const LATLNG_CACHE_PREFIX = 'place_latlng_';
/** 旧バージョンのプレフィックス（移行時に削除対象） */
const LEGACY_CACHE_PREFIX = 'place_cache_';
/** Google Maps Platform 利用規約が許可する最大キャッシュ期間: 30日 */
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

/** localStorage に保存する lat/lng のみのキャッシュエントリ */
interface LatLngCache {
  lat: number;
  lng: number;
  cachedAt: number;
}

/**
 * セッション中のメモリキャッシュ（スポット詳細全体）
 * ページリロード時にクリアされるため、永続ストレージへの規約違反なし
 */
const memoryCache = new Map<string, SpotMetaType>();

/** テスト用: メモリキャッシュをリセットする */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/** lat/lng をローカルストレージから取得する（30日以内のもののみ） */
function getCachedLatLng(placeId: string): { lat: number; lng: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LATLNG_CACHE_PREFIX + placeId);
    if (!raw) return null;
    const parsed: LatLngCache = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_DURATION_MS) {
      localStorage.removeItem(LATLNG_CACHE_PREFIX + placeId);
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

/** lat/lng のみをローカルストレージにキャッシュする（規約準拠） */
function setCachedLatLng(placeId: string, lat: number, lng: number): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: LatLngCache = { lat, lng, cachedAt: Date.now() };
    localStorage.setItem(LATLNG_CACHE_PREFIX + placeId, JSON.stringify(entry));
  } catch {
    // ストレージ容量超過は無視する
  }
}

/**
 * 期限切れのキャッシュエントリを削除する。
 * 旧バージョン（place_cache_*）のエントリも合わせて削除する。
 */
export function cleanExpiredPlaceCache(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // 旧形式のキャッシュは無条件で削除（name 等の規約違反データを含む）
    if (key.startsWith(LEGACY_CACHE_PREFIX)) {
      keysToRemove.push(key);
      continue;
    }

    if (!key.startsWith(LATLNG_CACHE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: LatLngCache = JSON.parse(raw);
        if (Date.now() - parsed.cachedAt > CACHE_DURATION_MS) {
          keysToRemove.push(key);
        }
      }
    } catch {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export type FetchPlaceResult = {
  data: SpotMetaType | null;
  hasError: boolean;
  errorMessage?: string;
};

/**
 * placeId を使って Google Maps Place Details を取得する。
 *
 * 1. セッション内メモリキャッシュを確認（スポット詳細全体）
 * 2. なければ Google Maps API から取得
 * 3. lat/lng のみ localStorage に 30 日間保存（Google Maps Platform 利用規約準拠）
 * 4. 詳細情報はメモリキャッシュに保存（セッション中有効）
 *
 * 失敗時は最大 3 回リトライする。
 */
export async function fetchPlaceDetailsWithRetry(placeId: string): Promise<FetchPlaceResult> {
  // 1. メモリキャッシュ確認（セッション中は再取得不要）
  const memoryCached = memoryCache.get(placeId);
  if (memoryCached) return { data: memoryCached, hasError: false };

  // 2. API 取得 + リトライ
  for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
    try {
      const place = await fetchPlaceById(placeId);
      const meta = convertPlaceToSpotMeta(place, placeId);

      // lat/lng のみ localStorage にキャッシュ（規約準拠）
      setCachedLatLng(placeId, meta.latitude, meta.longitude);
      // 詳細情報はメモリキャッシュに保存（永続ストレージへの保存禁止のため）
      memoryCache.set(placeId, meta);

      return { data: meta, hasError: false };
    } catch (err) {
      if (attempt === MAX_RETRY_COUNT) {
        const message = err instanceof Error ? err.message : '情報を取得できませんでした';
        return { data: null, hasError: true, errorMessage: message };
      }
      // 指数バックオフ的に待機
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }

  return { data: null, hasError: true, errorMessage: '情報を取得できませんでした' };
}

/**
 * localStorage に保存された lat/lng キャッシュを取得する。
 * 地図マーカー表示など、API を再呼び出しせずに座標のみ必要な場合に使用する。
 */
export function getCachedCoordinates(placeId: string): { lat: number; lng: number } | null {
  return getCachedLatLng(placeId);
}
