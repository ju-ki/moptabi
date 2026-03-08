import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useSWR from 'swr';

import { usePlanLocationCandidates, usePlanLocationList } from '@/hooks/use-plan-location';
import { LOCATION_TYPE } from '@/models/planLocation';

// SWRのモック
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// use-fetcherのモック
vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({
    getFetcher: vi.fn(),
    getAuthHeaders: vi.fn(() => ({ 'X-User-Id': 'test-user-123' })),
    isAuthenticated: true,
    isSessionLoading: false,
    session: { user: { id: 'test-user-123' } },
  }),
}));

const mockUseSWR = vi.mocked(useSWR);

const mockCandidatesResponse = {
  favorites: [
    {
      id: 1,
      name: '自宅',
      latitude: 35.6895,
      longitude: 139.6917,
      address: '東京都渋谷区1-1-1',
      usageCount: 5,
      isFavorite: true,
      isDefault: true,
      label: '自宅',
    },
  ],
  history: [
    {
      id: 2,
      name: '2025-01-15_出発地',
      latitude: 35.6812,
      longitude: 139.7671,
      address: null,
      usageCount: 3,
      isFavorite: false,
      locationType: 'DEPARTURE',
    },
  ],
};

const mockListResponse = [
  {
    id: 1,
    userId: 'test-user-123',
    planId: null,
    name: '2025-01-15_出発地',
    latitude: 35.6895,
    longitude: 139.6917,
    address: null,
    locationType: 'DEPARTURE',
    usageCount: 3,
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('usePlanLocationCandidates', () => {
  it('候補一覧を取得できる', () => {
    mockUseSWR.mockReturnValue({
      data: mockCandidatesResponse,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationCandidates());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.candidates).toBeDefined();
    expect(result.current.candidates?.favorites).toHaveLength(1);
    expect(result.current.candidates?.favorites[0].name).toBe('自宅');
    expect(result.current.candidates?.history).toHaveLength(1);
    expect(result.current.candidates?.history[0].name).toBe('2025-01-15_出発地');
  });

  it('ローディング中はisLoadingがtrueになる', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationCandidates());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.candidates).toBeUndefined();
  });

  it('お気に入り地点にisFavorite: trueが設定される', () => {
    mockUseSWR.mockReturnValue({
      data: mockCandidatesResponse,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationCandidates());

    expect(result.current.candidates?.favorites[0].isFavorite).toBe(true);
  });

  it('履歴地点にisFavorite: falseが設定される', () => {
    mockUseSWR.mockReturnValue({
      data: mockCandidatesResponse,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationCandidates());

    expect(result.current.candidates?.history[0].isFavorite).toBe(false);
  });

  it('エラー時はerrorが設定される', () => {
    const testError = new Error('テストエラー');
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: testError,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationCandidates());

    expect(result.current.error).toBe(testError);
  });
});

describe('usePlanLocationList', () => {
  it('PlanLocation一覧を取得できる', () => {
    mockUseSWR.mockReturnValue({
      data: mockListResponse,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationList());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.planLocations).toHaveLength(1);
    expect(result.current.planLocations[0].name).toBe('2025-01-15_出発地');
    expect(result.current.planLocations[0].locationType).toBe('DEPARTURE');
  });

  it('データがない場合は空配列を返す', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationList());

    expect(result.current.planLocations).toEqual([]);
  });

  it('ローディング中はisLoadingがtrueになる', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => usePlanLocationList());

    expect(result.current.isLoading).toBe(true);
  });
});
