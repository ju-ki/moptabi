import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useSpotSearchStore } from '@/store/planning/spotSearchStore';

// 各テスト前にストアをリセット
beforeEach(() => {
  const { resetFilters } = useSpotSearchStore.getState();
  act(() => resetFilters());
});

describe('useSpotSearchStore — selectedThemes', () => {
  it('初期値が空配列である', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    expect(result.current.selectedThemes).toEqual([]);
  });

  it('setSelectedThemes でテーマ配列を更新できる', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.setSelectedThemes(['gourmet', 'nature']));
    expect(result.current.selectedThemes).toEqual(['gourmet', 'nature']);
  });

  it('resetFilters で空配列に戻る', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.setSelectedThemes(['gourmet']));
    act(() => result.current.resetFilters());
    expect(result.current.selectedThemes).toEqual([]);
  });
});

describe('useSpotSearchStore — planSpotSelection', () => {
  it('初期値が空配列である', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    expect(result.current.planSpotSelection).toEqual([]);
  });

  it('togglePlanSpotSelection でスポットを追加できる', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    expect(result.current.planSpotSelection).toEqual(['spot-1']);
  });

  it('同じスポットを再度 toggle すると削除される', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    expect(result.current.planSpotSelection).toEqual([]);
  });

  it('2件まで追加できる', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    act(() => result.current.togglePlanSpotSelection('spot-2'));
    expect(result.current.planSpotSelection).toEqual(['spot-1', 'spot-2']);
  });

  it('3件目の追加は無視される（最大2件制約）', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    act(() => result.current.togglePlanSpotSelection('spot-2'));
    act(() => result.current.togglePlanSpotSelection('spot-3'));
    expect(result.current.planSpotSelection).toEqual(['spot-1', 'spot-2']);
  });

  it('clearPlanSpotSelection で空配列に戻る', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    act(() => result.current.togglePlanSpotSelection('spot-2'));
    act(() => result.current.clearPlanSpotSelection());
    expect(result.current.planSpotSelection).toEqual([]);
  });

  it('resetFilters で空配列に戻る', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    act(() => result.current.resetFilters());
    expect(result.current.planSpotSelection).toEqual([]);
  });
});
