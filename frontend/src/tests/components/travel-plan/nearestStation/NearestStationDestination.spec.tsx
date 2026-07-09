import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NearestStationDestination from '@/components/travel-plan/nearestStation/NearestStationDestination';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TransportNodeType } from '@/types/plan';
import userEvent from '@testing-library/user-event';

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

describe('NearestStationDestination', () => {
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
      name: '羽田空港',
      latitude: 35.5494,
      longitude: 139.7798,
      nearestStation: undefined,
    });

    render(<NearestStationDestination date="2026-04-25" />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockSearchNearestStation).toHaveBeenCalledWith({
        center: {
          id: 'destination',
          name: '羽田空港',
          lat: 35.5494,
          lng: 139.7798,
        },
        radius: 1,
        excludeBusStop: false,
      });
    });
  });

  it('最寄駅スイッチOFFで destination.nearestStation をクリアする', () => {
    mockGetDepartureAndDestination.mockReturnValue({
      name: '羽田空港',
      latitude: 35.5494,
      longitude: 139.7798,
      nearestStation: {
        spotId: 'destination',
        placeId: 'dest-station',
        name: '羽田空港第1・第2ターミナル駅',
        walkingTime: 3,
        latitude: 35.5494,
        longitude: 139.7798,
      },
    });

    render(
      <TooltipProvider>
        <NearestStationDestination date="2026-04-25" />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DESTINATION,
      expect.objectContaining({ nearestStation: undefined }),
    );
  });

  it('ヘッダーはモバイルで縦積みしPCでは横並びを維持する', () => {
    mockGetDepartureAndDestination.mockReturnValue({
      name: '羽田空港',
      latitude: 35.5494,
      longitude: 139.7798,
      nearestStation: undefined,
    });

    render(<NearestStationDestination date="2026-04-25" />);

    expect(screen.getByTestId('destination-station-section-toggle')).toHaveClass(
      'flex-col',
      'sm:flex-row',
      'sm:justify-between',
    );
  });

  // SPEC: PC-NSDT-001
  it('最寄駅選択で placeId がストアに保存される', async () => {
    mockSearchNearestStation.mockResolvedValue([
      {
        placeId: 'dst-456',
        spotId: '',
        stationType: 'TRAIN',
        name: '羽田空港第1・第2ターミナル駅',
        walkingTime: 3,
        latitude: 35.5494,
        longitude: 139.7798,
        distance: 200,
      },
    ]);
    mockGetDepartureAndDestination.mockReturnValue({
      name: '羽田空港',
      latitude: 35.5494,
      longitude: 139.7798,
      nearestStation: undefined,
    });

    render(<NearestStationDestination date="2026-04-25" />);

    fireEvent.click(screen.getByRole('switch'));

    // 駅の読み込みが完了して Select の onValueChange が設定されるまで待つ
    await waitFor(() => {
      expect(capturedOnValueChange).toBeDefined();
    });

    act(() => {
      capturedOnValueChange!('dst-456');
    });

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DESTINATION,
      expect.objectContaining({
        nearestStation: expect.objectContaining({ placeId: 'dst-456' }),
      }),
    );
  });

  // SPEC: PC-NSDT-002
  it('移動時間入力で transitTime が更新される', () => {
    const user = userEvent.setup();
    mockGetDepartureAndDestination.mockReturnValue({
      name: '羽田空港',
      latitude: 35.5494,
      longitude: 139.7798,
      nearestStation: {
        spotId: 'destination',
        placeId: 'dest-station',
        stationType: 'TRAIN',
        name: '羽田空港第1・第2ターミナル駅',
        walkingTime: 3,
        latitude: 35.5494,
        longitude: 139.7798,
        transitTime: 20,
      },
    });

    render(
      <TooltipProvider>
        <NearestStationDestination date="2026-04-25" />
      </TooltipProvider>,
    );

    const transitTimeInput = screen.getByTestId('transit-time-test');

    fireEvent.change(transitTimeInput, { target: { value: 35 } });

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DESTINATION,
      expect.objectContaining({
        nearestStation: expect.objectContaining({ transitTime: 35 }),
      }),
    );
  });

  // SPEC: PC-NSDT-003
  it('路線メモ入力で memo が更新される', async () => {
    const user = userEvent.setup();
    mockGetDepartureAndDestination.mockReturnValue({
      name: '羽田空港',
      latitude: 35.5494,
      longitude: 139.7798,
      nearestStation: {
        spotId: 'destination',
        placeId: 'dest-station',
        stationType: 'TRAIN',
        name: '羽田空港第1・第2ターミナル駅',
        walkingTime: 3,
        latitude: 35.5494,
        longitude: 139.7798,
      },
    });

    render(
      <TooltipProvider>
        <NearestStationDestination date="2026-04-25" />
      </TooltipProvider>,
    );

    const memoTextarea = screen.getByPlaceholderText('例: ○○線 △△行き、乗り換え1回');
    await user.type(memoTextarea, 'モノレール 羽田空港行き');

    expect(mockSetDepartureAndDestination).toHaveBeenCalledWith(
      '2026-04-25',
      TransportNodeType.DESTINATION,
      expect.objectContaining({
        nearestStation: expect.objectContaining({ transitMemo: 'モノレール 羽田空港行き' }),
      }),
    );
  });
});
