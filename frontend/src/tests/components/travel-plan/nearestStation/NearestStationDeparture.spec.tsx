import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NearestStationDeparture from '@/components/travel-plan/nearestStation/NearestStationDeparture';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TransportNodeType } from '@/types/plan';

const mockSearchNearestStation = vi.fn();
const mockGetSpotInfo = vi.fn();
const mockGetDepartureAndDestination = vi.fn();
const mockSetDepartureAndDestination = vi.fn();

// Radix UI の Select はjsdom環境で操作が困難なため、モックで onValueChange を取得する
let capturedOnValueChange: ((v: string) => void) | undefined;
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => {
    if (onValueChange) capturedOnValueChange = onValueChange;
    return <div>{children}</div>;
  },
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder || ''}</span>,
}));

vi.mock('@/lib/google-maps', () => ({
  searchNearestStation: (...args: unknown[]) => mockSearchNearestStation(...args),
}));

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getSpotInfo: mockGetSpotInfo,
    getDepartureAndDestination: mockGetDepartureAndDestination,
    setDepartureAndDestination: mockSetDepartureAndDestination,
  }),
}));

describe('NearestStationDeparture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnValueChange = undefined;
    mockGetSpotInfo.mockReturnValue([
      {
        id: 'spot-1',
        location: { id: 'loc-1', name: '浅草寺', lat: 35.71, lng: 139.79 },
        nearestStation: { name: '浅草駅', walkingTime: 4, latitude: 35.71, longitude: 139.79 },
      },
    ]);
    mockSearchNearestStation.mockResolvedValue([]);
  });

  it('最寄駅スイッチONで searchNearestStation を呼び出す', async () => {
    mockGetDepartureAndDestination.mockReturnValue({
      name: '東京駅',
      latitude: 35.6812,
      longitude: 139.7671,
      nearestStation: undefined,
    });

    render(<NearestStationDeparture date="2026-04-25" />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockSearchNearestStation).toHaveBeenCalledWith({
        center: {
          id: 'departure',
          name: '東京駅',
          lat: 35.6812,
          lng: 139.7671,
        },
        radius: 1,
        excludeBusStop: false,
      });
    });
  });

  it('最寄駅スイッチOFFで departure.nearestStation をクリアする', () => {
    mockGetDepartureAndDestination.mockReturnValue({
      name: '東京駅',
      latitude: 35.6812,
      longitude: 139.7671,
      nearestStation: {
        spotId: 'departure',
        placeId: 'd-station',
        name: '東京駅',
        walkingTime: 5,
        latitude: 35.6812,
        longitude: 139.7671,
      },
    });

    render(<NearestStationDeparture date="2026-04-25" />);

    fireEvent.click(screen.getByRole('switch'));

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DEPARTURE,
      expect.objectContaining({ nearestStation: undefined }),
    );
  });

  it('ヘッダーはモバイルで縦積みしPCでは横並びを維持する', () => {
    mockGetDepartureAndDestination.mockReturnValue({
      name: '東京駅',
      latitude: 35.6812,
      longitude: 139.7671,
      nearestStation: undefined,
    });

    render(<NearestStationDeparture date="2026-04-25" />);

    expect(screen.getByTestId('departure-station-section-toggle')).toHaveClass(
      'flex-col',
      'sm:flex-row',
      'sm:justify-between',
    );
  });

  // SPEC: PC-NSD-001
  it('最寄駅選択で placeId がストアに保存される', async () => {
    mockSearchNearestStation.mockResolvedValue([
      {
        placeId: 'st-123',
        spotId: '',
        stationType: 'TRAIN',
        name: '東京駅',
        walkingTime: 5,
        latitude: 35.6812,
        longitude: 139.7671,
        distance: 300,
      },
    ]);
    mockGetDepartureAndDestination.mockReturnValue({
      name: '東京駅',
      latitude: 35.6812,
      longitude: 139.7671,
      nearestStation: undefined,
    });

    render(<NearestStationDeparture date="2026-04-25" />);

    fireEvent.click(screen.getByRole('switch'));

    // 駅の読み込みが完了して Select の onValueChange が設定されるまで待つ
    await waitFor(() => {
      expect(capturedOnValueChange).toBeDefined();
    });

    act(() => {
      capturedOnValueChange!('st-123');
    });

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DEPARTURE,
      expect.objectContaining({
        nearestStation: expect.objectContaining({ placeId: 'st-123' }),
      }),
    );
  });

  // SPEC: PC-NSD-002
  it('候補時刻入力で suggestedTransitTimes が更新される', () => {
    mockGetDepartureAndDestination.mockReturnValue({
      name: '東京駅',
      latitude: 35.6812,
      longitude: 139.7671,
      nearestStation: {
        spotId: 'departure',
        placeId: 'd-station',
        stationType: 'TRAIN',
        name: '東京駅',
        walkingTime: 5,
        latitude: 35.6812,
        longitude: 139.7671,
        scheduledDepartureTime: '',
      },
    });

    const { container } = render(
      <TooltipProvider>
        <NearestStationDeparture date="2026-04-25" />
      </TooltipProvider>,
    );

    // セクションを展開
    fireEvent.click(screen.getByText('出発地の最寄駅'));

    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '09:30' } });

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DEPARTURE,
      expect.objectContaining({
        nearestStation: expect.objectContaining({ scheduledDepartureTime: '09:30' }),
      }),
    );
  });

  // SPEC: PC-NSD-003
  it('路線メモ入力で memo が更新される', () => {
    mockGetDepartureAndDestination.mockReturnValue({
      name: '東京駅',
      latitude: 35.6812,
      longitude: 139.7671,
      nearestStation: {
        spotId: 'departure',
        placeId: 'd-station',
        stationType: 'TRAIN',
        name: '東京駅',
        walkingTime: 5,
        latitude: 35.6812,
        longitude: 139.7671,
      },
    });

    render(
      <TooltipProvider>
        <NearestStationDeparture date="2026-04-25" />
      </TooltipProvider>,
    );

    // セクションを展開
    fireEvent.click(screen.getByText('出発地の最寄駅'));

    const memoTextarea = screen.getByPlaceholderText('例: ○○線 △△行き、乗り換え1回');
    fireEvent.change(memoTextarea, { target: { value: '山手線 渋谷行き' } });

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DEPARTURE,
      expect.objectContaining({
        nearestStation: expect.objectContaining({ transitMemo: '山手線 渋谷行き' }),
      }),
    );
  });
});
