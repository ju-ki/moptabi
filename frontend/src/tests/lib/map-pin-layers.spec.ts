import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadMapPinLayers, MAP_PIN_LAYERS_STORAGE_KEY, saveMapPinLayers } from '@/lib/map-pin-layers';

/**
 * 地図で探すの「表示するピン」の保存・復元（No.341）を検証する
 */
describe('map-pin-layers', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('保存がないときは両方 OFF', () => {
    expect(loadMapPinLayers()).toEqual({ wishlist: false, visited: false });
  });

  it('保存した状態を復元できる', () => {
    saveMapPinLayers({ wishlist: true, visited: false });

    expect(localStorage.getItem(MAP_PIN_LAYERS_STORAGE_KEY)).not.toBeNull();
    expect(loadMapPinLayers()).toEqual({ wishlist: true, visited: false });
  });

  it('壊れた値が保存されていても両方 OFF で返す', () => {
    localStorage.setItem(MAP_PIN_LAYERS_STORAGE_KEY, '{broken');

    expect(loadMapPinLayers()).toEqual({ wishlist: false, visited: false });
  });

  it('localStorage が例外を投げても、読み込みは既定値・保存はエラーにならない', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(loadMapPinLayers()).toEqual({ wishlist: false, visited: false });
    expect(() => saveMapPinLayers({ wishlist: true, visited: true })).not.toThrow();
  });
});
