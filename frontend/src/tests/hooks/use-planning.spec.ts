import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { usePlanning } from '@/hooks/use-planning';
import { useStoreForPlanning } from '@/lib/plan';
import { executePlanning } from '@/lib/planning';
import { TransportNodeType } from '@/types/plan';

vi.mock('@/lib/planning', () => ({
  executePlanning: vi.fn(),
}));

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: {
    getState: vi.fn(),
  },
}));

const mockExecutePlanning = vi.mocked(executePlanning);

describe('usePlanning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutePlanning.mockResolvedValue({
      updatedDeparture: {
        transportMethodId: 1,
        name: '出発地',
        transportMethod: 'WALKING',
        travelTime: 0,
        time: '10:00',
        latitude: 35.6895,
        locationType: 'DEPARTURE',
        longitude: 139.6917,
      },
      updatedDestination: {
        name: '到着地',
        locationType: 'DESTINATION',
        transportMethodId: 1,
        transportMethod: 'WALKING',
        travelTime: 0,
        time: '10:00',
        latitude: 35.6895,
        longitude: 139.6917,
      },
      updatedSpots: [],
      routes: [],
      totalDuration: 0,
      totalDistance: 0,
      departureTime: '10:00',
      arrivalTime: '10:00',
      messages: [],
      isOverTime: false,
    });
  });

  const createMockState = (overrides?: any) => {
    return {
      startDate: '2024-06-01',
      endDate: '2024-06-01',
      resetErrors: vi.fn(),
      getDepartureAndDestination: vi.fn((date, type) => {
        return type === TransportNodeType.DEPARTURE ? { time: '' } : { time: '10:00' };
      }),
      getSpotInfo: vi.fn(() => [{ id: '1', name: 'スポット1', order: 1, nearestStation: {} }]),
      setPlanErrors: vi.fn(),
      setSimulationStatus: vi.fn(),
      getPlanningInfo: vi.fn(() => ({ transportationMethodId: [1] })),
      setErrors: vi.fn(),
      setPlanningResult: vi.fn(),
      setDepartureAndDestination: vi.fn(),
      editSpots: vi.fn(),
      switchAlternativeRoute: vi.fn(),
      ...overrides,
    };
  };

  it('出発時間が空の場合にエラーになる', async () => {
    const setPlanErrorsMock = vi.fn();
    const mockState = createMockState({
      getDepartureAndDestination: vi.fn((date, type) => {
        return type === TransportNodeType.DEPARTURE ? { time: '' } : { time: '10:00' };
      }),
      setPlanErrors: setPlanErrorsMock,
    });

    // useStoreForPlanning.getState を直接モック
    (useStoreForPlanning.getState as any).mockReturnValue(mockState);

    const { result } = renderHook(() => usePlanning());
    await result.current.handlePreprocessingPlanning({ date: '2024-06-01' });

    expect(setPlanErrorsMock).toHaveBeenCalledWith('2024-06-01', {
      departure: '出発時間と到着時間を入力してください',
    });
  });

  it('到着時間が空の場合にエラーになる', async () => {
    const setPlanErrorsMock = vi.fn();
    const mockState = createMockState({
      getDepartureAndDestination: vi.fn((date, type) => {
        return type === TransportNodeType.DEPARTURE ? { time: '10:00' } : { time: '' };
      }),
      setPlanErrors: setPlanErrorsMock,
    });

    (useStoreForPlanning.getState as any).mockReturnValue(mockState);

    const { result } = renderHook(() => usePlanning());
    await result.current.handlePreprocessingPlanning({ date: '2024-06-01' });

    expect(setPlanErrorsMock).toHaveBeenCalledWith('2024-06-01', {
      departure: '出発時間と到着時間を入力してください',
    });
  });

  it('出発時間と到着時間が両方空の場合にエラーになる', async () => {
    const setPlanErrorsMock = vi.fn();
    const mockState = createMockState({
      getDepartureAndDestination: vi.fn((date, type) => {
        return { time: '' };
      }),
      setPlanErrors: setPlanErrorsMock,
    });

    (useStoreForPlanning.getState as any).mockReturnValue(mockState);

    const { result } = renderHook(() => usePlanning());
    await result.current.handlePreprocessingPlanning({ date: '2024-06-01' });

    expect(setPlanErrorsMock).toHaveBeenCalledWith('2024-06-01', {
      departure: '出発時間と到着時間を入力してください',
    });
  });

  it('出発時間と到着時間が両方入力の場合にエラーにならない', async () => {
    const setPlanErrorsMock = vi.fn();
    const mockState = createMockState({
      getDepartureAndDestination: vi.fn((date, type) => {
        return type === TransportNodeType.DEPARTURE ? { time: '10:00' } : { time: '18:00' };
      }),
      setPlanErrors: setPlanErrorsMock,
      setSimulationStatus: vi.fn(),
    });

    (useStoreForPlanning.getState as any).mockReturnValue(mockState);

    const { result } = renderHook(() => usePlanning());
    await result.current.handlePreprocessingPlanning({ date: '2024-06-01' });

    // エラーが呼び出されないことを確認
    expect(setPlanErrorsMock).not.toHaveBeenCalled();
    // シミュレーション開始ステータスが設定されることを確認
    expect(mockState.setSimulationStatus).toHaveBeenCalledWith({ date: '2024-06-01', status: 1 });
  });
});
