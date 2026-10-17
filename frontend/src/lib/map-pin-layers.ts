import { MapPinLayers } from '@/types/plan';

/** 地図で探すの「表示するピン」を保存する localStorage のキー（No.341） */
export const MAP_PIN_LAYERS_STORAGE_KEY = 'moptabi:map-pin-layers';

export const DEFAULT_MAP_PIN_LAYERS: MapPinLayers = { wishlist: false, visited: false };

/**
 * 保存した「表示するピン」を読み込む。保存がない・読めない（プライベートブラウズ等）ときは両方 OFF
 */
export function loadMapPinLayers(): MapPinLayers {
  if (typeof window === 'undefined') return DEFAULT_MAP_PIN_LAYERS;
  try {
    const raw = window.localStorage.getItem(MAP_PIN_LAYERS_STORAGE_KEY);
    if (!raw) return DEFAULT_MAP_PIN_LAYERS;
    const parsed: Partial<MapPinLayers> = JSON.parse(raw);
    return { wishlist: parsed.wishlist === true, visited: parsed.visited === true };
  } catch {
    return DEFAULT_MAP_PIN_LAYERS;
  }
}

/**
 * 「表示するピン」を保存する。保存できない環境では何もしない
 */
export function saveMapPinLayers(layers: MapPinLayers): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MAP_PIN_LAYERS_STORAGE_KEY, JSON.stringify(layers));
  } catch {
    // 保存できなくても表示には影響しないため無視する
  }
}
