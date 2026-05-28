import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import PlanSpotSettingCard from '@/components/travel-plan/PlanSpotSettingCard';
import { searchNearestStation } from '@/lib/google-maps';
import { Spot, TransportNodeType } from '@/types/plan';

vi.mock('@/lib/google-maps', () => ({
  searchNearestStation: vi.fn().mockResolvedValue([]),
}));

const createSpot = (overrides: Partial<Spot> = {}): Spot => ({
  id: 'spot-1',
  order: 1,
  location: {
    id: 'loc-1',
    name: '東京タワー',
    lat: 35.6586,
    lng: 139.7454,
  },
  stayStart: '10:00',
  stayEnd: '11:00',
  stayDuration: 60,
  transports: {
    transportMethod: 1,
    name: 'TRANSIT',
    travelTime: '20分',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  ...overrides,
});

describe('PlanSpotSettingCard', () => {
  const baseProps = {
    previousLocation: { id: 'prev', name: '出発地', lat: 35.68, lng: 139.76 },
    totalSpots: 3,
    onSettingChange: vi.fn(),
    onOrderChange: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onDragLeave: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stayDuration が未設定でも 60分(1時間)として表示する', () => {
    render(<PlanSpotSettingCard {...baseProps} spot={createSpot({ stayDuration: undefined })} />);

    expect(screen.getByText('(1時間)')).toBeInTheDocument();
  });

  it('滞在時間入力で onSettingChange に更新値を渡す', () => {
    const onSettingChange = vi.fn();
    render(<PlanSpotSettingCard {...baseProps} spot={createSpot()} onSettingChange={onSettingChange} />);

    const durationInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(durationInputs[0], { target: { value: '2' } });

    expect(onSettingChange).toHaveBeenCalled();
    const latestCall = onSettingChange.mock.calls.at(-1)?.[0];
    expect(latestCall.stayDuration).toBe(120);
  });

  it('最寄駅スイッチをOFFにすると nearestStation をクリアする', () => {
    const onSettingChange = vi.fn();
    render(
      <PlanSpotSettingCard
        {...baseProps}
        onSettingChange={onSettingChange}
        spot={createSpot({
          nearestStation: {
            placeId: 'station-1',
            spotId: 'spot-1',
            stationType: 'TRAIN',
            name: '神谷町駅',
            walkingTime: 6,
            latitude: 35.66,
            longitude: 139.74,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole('switch'));

    const latestCall = onSettingChange.mock.calls.at(-1)?.[0];
    expect(latestCall.nearestStation).toBeUndefined();
  });

  // SPEC: PC-PSC-001
  it('最寄駅トグルをONにすると最寄駅検索API呼び出しが開始される', async () => {
    render(<PlanSpotSettingCard {...baseProps} spot={createSpot({ nearestStation: undefined })} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(searchNearestStation).toHaveBeenCalled();
    });
  });

  // SPEC: PC-PSC-003
  it('発車時間候補を1件入力すると対象候補のみ更新される', () => {
    const onSettingChange = vi.fn();
    const nearestStation = {
      placeId: 'st-1',
      spotId: 'spot-1',
      stationType: 'TRAIN' as const,
      name: '渋谷駅',
      walkingTime: 5,
      latitude: 35.66,
      longitude: 139.7,
    };
    const prevSpot = createSpot({
      id: 'prev-1',
      nearestStation: {
        placeId: 'prev-st',
        spotId: 'prev-1',
        stationType: 'TRAIN' as const,
        name: '新宿駅',
        walkingTime: 3,
        latitude: 35.69,
        longitude: 139.7,
      },
    });

    const { container } = render(
      <TooltipProvider>
        <PlanSpotSettingCard
          {...baseProps}
          spot={createSpot({ nearestStation })}
          previousSpot={prevSpot}
          onSettingChange={onSettingChange}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId('station-section-toggle'));

    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '09:15' } });

    const latestCall = onSettingChange.mock.calls.at(-1)?.[0];
    expect(latestCall.nearestStation).toMatchObject({ scheduledDepartureTime: '09:15' });
  });

  // SPEC: PC-PSC-004
  it('発車時間候補を複数入力すると候補配列の順序を維持して更新される', () => {
    const onSettingChange = vi.fn();
    const nearestStation = {
      placeId: 'st-1',
      spotId: 'spot-1',
      stationType: 'TRAIN' as const,
      name: '渋谷駅',
      walkingTime: 5,
      latitude: 35.66,
      longitude: 139.7,
      scheduledDepartureTime: '09:00',
    };
    const prevSpot = createSpot({
      id: 'prev-1',
      nearestStation: {
        placeId: 'prev-st',
        spotId: 'prev-1',
        stationType: 'TRAIN' as const,
        name: '新宿駅',
        walkingTime: 3,
        latitude: 35.69,
        longitude: 139.7,
      },
    });

    const { container } = render(
      <TooltipProvider>
        <PlanSpotSettingCard
          {...baseProps}
          spot={createSpot({ nearestStation })}
          previousSpot={prevSpot}
          onSettingChange={onSettingChange}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId('station-section-toggle'));

    // 1件目: scheduledDepartureTime を更新
    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '08:30' } });

    // 2件目: transitMemo を更新しても scheduledDepartureTime が元の値から引き継がれる
    const memoTextarea = screen.getByPlaceholderText('例: ○○線 △△行き、乗り換え1回');
    fireEvent.change(memoTextarea, { target: { value: '山手線 渋谷行き' } });

    const memoCall = onSettingChange.mock.calls.at(-1)?.[0];
    // nearestStation.scheduledDepartureTime は元の prop 値から変わらない（独立した更新）
    expect(memoCall.nearestStation).toMatchObject({ scheduledDepartureTime: '09:00' });
    expect(memoCall.nearestStation).toMatchObject({ transitMemo: '山手線 渋谷行き' });
  });

  // SPEC: PC-PSC-002
  it('移動時間を入力するとストア値が更新される', () => {
    const onSettingChange = vi.fn();
    const nearestStation = {
      placeId: 'st-1',
      spotId: 'spot-1',
      stationType: 'TRAIN' as const,
      name: '渋谷駅',
      walkingTime: 5,
      latitude: 35.66,
      longitude: 139.7,
      transitTime: 30,
    };
    const prevSpot = createSpot({
      id: 'prev-1',
      nearestStation: {
        placeId: 'prev-st',
        spotId: 'prev-1',
        stationType: 'TRAIN' as const,
        name: '新宿駅',
        walkingTime: 3,
        latitude: 35.69,
        longitude: 139.7,
      },
    });

    const { container } = render(
      <TooltipProvider>
        <PlanSpotSettingCard
          {...baseProps}
          spot={createSpot({ nearestStation })}
          previousSpot={prevSpot}
          onSettingChange={onSettingChange}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId('station-section-toggle'));

    const transitTimeInput = container.querySelector('input[min="1"][max="540"]') as HTMLInputElement;
    fireEvent.change(transitTimeInput, { target: { value: '45' } });

    const latestCall = onSettingChange.mock.calls.at(-1)?.[0];
    expect(latestCall.nearestStation).toMatchObject({ transitTime: 45 });
  });
});
