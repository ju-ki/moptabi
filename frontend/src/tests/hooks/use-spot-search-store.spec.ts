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

describe('useSpotSearchStore — openOnPlanDate（No.158）', () => {
  it('初期値は false である', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    expect(result.current.openOnPlanDate).toBe(false);
  });

  it('setOpenOnPlanDate で切り替えられ、resetFilters で false に戻る', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.setOpenOnPlanDate(true));
    expect(result.current.openOnPlanDate).toBe(true);
    act(() => result.current.resetFilters());
    expect(result.current.openOnPlanDate).toBe(false);
  });
});

describe('useSpotSearchStore — searchMode（No.341）', () => {
  beforeEach(() => {
    act(() => useSpotSearchStore.setState({ searchMode: 'list' }));
  });

  it('初期値は list である', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    expect(result.current.searchMode).toBe('list');
  });

  it('setSearchMode で切り替えられ、resetFilters では戻らない（最後に使った探し方を残す）', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.setSearchMode('map'));
    expect(result.current.searchMode).toBe('map');
    act(() => result.current.resetFilters());
    expect(result.current.searchMode).toBe('map');
  });
});

describe('useSpotSearchStore — syncSearchDate（No.341 P-5）', () => {
  beforeEach(() => {
    act(() => useSpotSearchStore.setState({ searchDate: null }));
  });

  it('前回と違う日付ならプランの地点選択を空にする', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.syncSearchDate('2026-10-17'));
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    act(() => result.current.syncSearchDate('2026-10-18'));
    expect(result.current.planSpotSelection).toEqual([]);
    expect(result.current.searchDate).toBe('2026-10-18');
  });

  it('前回と同じ日付なら選択を残す', () => {
    const { result } = renderHook(() => useSpotSearchStore());
    act(() => result.current.syncSearchDate('2026-10-17'));
    act(() => result.current.togglePlanSpotSelection('spot-1'));
    act(() => result.current.syncSearchDate('2026-10-17'));
    expect(result.current.planSpotSelection).toEqual(['spot-1']);
  });
});
