import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { TooltipProvider } from '@/components/ui/tooltip';
import PlanSpotSettingCard from '@/components/travel-plan/PlanSpotSettingCard';
import { searchNearestStation } from '@/lib/google-maps';
import { ExtendPlanLocationType, ExtendSpotType } from '@/types/plan';

vi.mock('@/lib/google-maps', () => ({
  searchNearestStation: vi.fn().mockResolvedValue([
    {
      name: '東京タワー駅',
      walkingTime: 5,
      latitude: 35.6586,
      longitude: 139.7454,
    },
  ]),
}));

const createSpot = (overrides: Partial<ExtendSpotType> = {}): ExtendSpotType => ({
  id: 'spot-1',
  order: 1,
  spotId: 'spot-1',
  name: '東京タワー',
  latitude: 35.6586,
  longitude: 139.7454,
  stayStart: '10:00',
  stayEnd: '11:00',
  stayDuration: 60,
  rating: 4.5,
  transportMethodId: 1,
  transportMethod: 'WALKING',
  travelTime: 20,
  ...overrides,
});

describe('PlanSpotSettingCard', () => {
  const baseProps = {
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

  describe('最寄駅情報の項目表示', () => {
    describe('スポット間', () => {
      it('両方未設定', () => {
        render(
          <PlanSpotSettingCard
            {...baseProps}
            spot={createSpot()}
            nextSpot={createSpot({ nearestStation: undefined })}
          />,
        );
        const transitTimeInput = screen.queryByTestId('transit-time-test');
        expect(transitTimeInput).not.toBeInTheDocument();
        const memoTextarea = screen.queryByPlaceholderText('例: ○○線 △△行き、乗り換え1回');
        expect(memoTextarea).not.toBeInTheDocument();
      });

      it('片方設定済み', () => {
        const nearestStation = {
          placeId: 'station-1',
          spotId: 'spot-1',
          stationType: 'TRAIN' as const,
          name: '神谷町駅',
          walkingTime: 6,
          transitTime: 15,
          latitude: 35.66,
          longitude: 139.74,
        };
        // nextSpotのnearestStationが undefined の場合、最寄駅情報の入力項目は表示されない
        render(
          <PlanSpotSettingCard
            {...baseProps}
            spot={createSpot({ nearestStation })}
            nextSpot={createSpot({ nearestStation: undefined })}
          />,
        );
        const transitTimeInput = screen.queryByTestId('transit-time-test');
        expect(transitTimeInput).not.toBeInTheDocument();
        const memoTextarea = screen.queryByPlaceholderText('例: ○○線 △△行き、乗り換え1回');
        expect(memoTextarea).not.toBeInTheDocument();
      });
      it('両方設定済み', () => {
        const nearestStation = {
          placeId: 'station-1',
          spotId: 'spot-1',
          stationType: 'TRAIN' as const,
          name: '神谷町駅',
          walkingTime: 6,
          transitTime: 15,
          latitude: 35.66,
          longitude: 139.74,
        };

        const nextSpot = createSpot({
          id: 'spot-2',
          name: '六本木ヒルズ',
          nearestStation: {
            placeId: 'station-2',
            spotId: 'spot-2',
            stationType: 'TRAIN' as const,
            name: '赤羽橋駅',
            walkingTime: 4,
            transitTime: 10,
            latitude: 35.65,
            longitude: 139.74,
          },
        });

        render(
          <TooltipProvider>
            <PlanSpotSettingCard {...baseProps} spot={createSpot({ nearestStation })} nextSpot={nextSpot} />
          </TooltipProvider>,
        );

        const routeInfo = screen.getByTestId('route-info');
        expect(routeInfo).toBeInTheDocument();
        expect(routeInfo).toHaveTextContent('ルート: 東京タワー');
        expect(routeInfo).toHaveTextContent('神谷町駅(徒歩6分)→🚃 15分→赤羽橋駅(徒歩4分)');
        expect(routeInfo).toHaveTextContent('六本木ヒルズ');
      });
    });

    describe('最後のスポットと目的地', () => {
      it('両方設定なし', () => {
        const destinationData: ExtendPlanLocationType = {
          name: '目的地',
          latitude: 35.65,
          longitude: 139.74,
          locationType: 'DESTINATION' as const,
          time: '18:00',
          transportMethodId: 0,
          transportMethod: 'DEFAULT',
          travelTime: 0,
          nearestStation: undefined,
        };

        render(
          <TooltipProvider>
            <PlanSpotSettingCard
              {...baseProps}
              spot={createSpot({ nearestStation: undefined })}
              destinationData={destinationData}
            />
          </TooltipProvider>,
        );
      });
      it('片方設定済み', () => {
        const nearestStation = {
          placeId: 'station-1',
          spotId: 'spot-1',
          stationType: 'TRAIN' as const,
          name: '神谷町駅',
          walkingTime: 6,
          transitTime: 15,
          latitude: 35.66,
          longitude: 139.74,
        };

        const destinationData: ExtendPlanLocationType = {
          name: '目的地',
          latitude: 35.65,
          longitude: 139.74,
          locationType: 'DESTINATION' as const,
          time: '18:00',
          transportMethodId: 0,
          transportMethod: 'DEFAULT',
          travelTime: 0,
          nearestStation: undefined,
        };

        render(
          <TooltipProvider>
            <PlanSpotSettingCard
              {...baseProps}
              spot={createSpot({ nearestStation })}
              destinationData={destinationData}
            />
          </TooltipProvider>,
        );
      });
      it('両方設定済み', () => {
        const nearestStation = {
          placeId: 'station-1',
          spotId: 'spot-1',
          stationType: 'TRAIN' as const,
          name: '神谷町駅',
          walkingTime: 6,
          transitTime: 15,
          latitude: 35.66,
          longitude: 139.74,
        };

        const destinationData: ExtendPlanLocationType = {
          name: '目的地',
          latitude: 35.65,
          longitude: 139.74,
          locationType: 'DESTINATION' as const,
          time: '18:00',
          transportMethodId: 0,
          transportMethod: 'DEFAULT',
          travelTime: 0,
          nearestStation: {
            placeId: 'station-2',
            spotId: 'destination',
            stationType: 'TRAIN' as const,
            name: '赤羽橋駅',
            walkingTime: 4,
            transitTime: 0,
            latitude: 35.65,
            longitude: 139.74,
          },
        };

        render(
          <TooltipProvider>
            <PlanSpotSettingCard
              {...baseProps}
              spot={createSpot({ nearestStation })}
              destinationData={destinationData}
            />
          </TooltipProvider>,
        );

        const transitTimeInput = screen.getByTestId('transit-time-test');
        expect(transitTimeInput).toBeInTheDocument();
        const memoTextarea = screen.getByPlaceholderText('例: ○○線 △△行き、乗り換え1回');
        expect(memoTextarea).toBeInTheDocument();
      });
    });
    it('最後のスポットと目的地に最寄駅がある場合、ルート情報が正しく表示される', () => {
      const nearestStation = {
        placeId: 'station-1',
        spotId: 'spot-1',
        stationType: 'TRAIN' as const,
        name: '神谷町駅',
        walkingTime: 6,
        transitTime: 15,
        latitude: 35.66,
        longitude: 139.74,
      };

      const destinationData: ExtendPlanLocationType = {
        name: '目的地',
        latitude: 35.65,
        longitude: 139.74,
        locationType: 'DESTINATION' as const,
        time: '18:00',
        transportMethodId: 0,
        transportMethod: 'DEFAULT',
        travelTime: 0,
        nearestStation: {
          placeId: 'station-2',
          spotId: 'destination',
          stationType: 'TRAIN' as const,
          name: '赤羽橋駅',
          walkingTime: 4,
          transitTime: 0,
          latitude: 35.65,
          longitude: 139.74,
        },
      };

      render(
        <TooltipProvider>
          <PlanSpotSettingCard {...baseProps} spot={createSpot({ nearestStation })} destinationData={destinationData} />
        </TooltipProvider>,
      );

      const routeInfo = screen.getByTestId('route-info');
      expect(routeInfo).toBeInTheDocument();
      expect(routeInfo).toHaveTextContent('ルート: 東京タワー');
      expect(routeInfo).toHaveTextContent('神谷町駅(徒歩6分)→🚃 15分→赤羽橋駅(徒歩4分)');
      expect(routeInfo).toHaveTextContent('目的地');
    });
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

  it('最寄駅スイッチonでbusStopのチェックとスポットの座標が検索前後で変わっていない場合に searchNearestStationが呼び出されない', async () => {
    render(<PlanSpotSettingCard {...baseProps} spot={createSpot()} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(searchNearestStation).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('switch'));
    // 2回目の検索
    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(searchNearestStation).toHaveBeenCalledTimes(1);
    });
  });

  it('最寄駅スイッチonでbusStopのチェックが検索前後で変わっている場合に searchNearestStationが呼び出される', async () => {
    render(<PlanSpotSettingCard {...baseProps} spot={createSpot()} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(searchNearestStation).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('switch'));

    // チェックボックスを再度onにする(変更されている想定)
    fireEvent.click(screen.getByRole('checkbox'));

    // 2回目の検索
    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(searchNearestStation).toHaveBeenCalledTimes(2);
    });
  });

  // スポットの座標は変わることはないので不要

  it('最寄駅スイッチをOFFにすると nearestStation をクリアする', () => {
    const onSettingChange = vi.fn();
    render(
      <TooltipProvider>
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
              transitTime: 0,
              latitude: 35.66,
              longitude: 139.74,
            },
          })}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole('switch'));

    const latestCall = onSettingChange.mock.calls.at(-1)?.[0];
    expect(latestCall.nearestStation).toBeUndefined();
  });

  it('最寄駅ヘッダーはモバイルで縦積みしPCでは横並びを維持する', () => {
    render(<PlanSpotSettingCard {...baseProps} spot={createSpot()} />);

    expect(screen.getByTestId('station-section-toggle')).toHaveClass('flex-col', 'sm:flex-row', 'sm:justify-between');
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
  it('発車時間候補を1件入力すると対象候補のみ更新される', async () => {
    const onSettingChange = vi.fn();
    const user = userEvent.setup();
    const nearestStation = {
      placeId: 'st-1',
      spotId: 'spot-1',
      stationType: 'TRAIN' as const,
      name: '渋谷駅',
      walkingTime: 5,
      latitude: 35.66,
      longitude: 139.7,
      transitTime: 0,
    };
    const prevSpot = createSpot({
      id: 'prev-1',
      nearestStation: {
        placeId: 'prev-st',
        spotId: 'prev-1',
        stationType: 'TRAIN' as const,
        name: '新宿駅',
        transitTime: 0,
        walkingTime: 3,
        latitude: 35.69,
        longitude: 139.7,
      },
    });

    render(
      <TooltipProvider>
        <PlanSpotSettingCard
          {...baseProps}
          spot={createSpot({ nearestStation })}
          nextSpot={prevSpot}
          onSettingChange={onSettingChange}
        />
      </TooltipProvider>,
    );

    const timeInput = screen.getByTestId('scheduled-departure-1');
    await user.type(timeInput, '09:15');
    const latestCall = onSettingChange.mock.calls.at(-1)?.[0];
    expect(latestCall.nearestStation).toMatchObject({ scheduledDepartureTime: '09:15' });
  });

  // SPEC: PC-PSC-004
  it('発車時間候補を複数入力すると候補配列の順序を維持して更新される', async () => {
    const onSettingChange = vi.fn();
    const user = userEvent.setup();
    const nearestStation = {
      placeId: 'st-1',
      spotId: 'spot-1',
      stationType: 'TRAIN' as const,
      name: '渋谷駅',
      walkingTime: 5,
      latitude: 35.66,
      longitude: 139.7,
      transitTime: 0,
      scheduledDepartureTime: '09:00',
    };
    const prevSpot = createSpot({
      id: 'prev-1',
      nearestStation: {
        placeId: 'prev-st',
        spotId: 'prev-1',
        stationType: 'TRAIN' as const,
        name: '新宿駅',
        transitTime: 0,
        walkingTime: 3,
        latitude: 35.69,
        longitude: 139.7,
      },
    });

    render(
      <TooltipProvider>
        <PlanSpotSettingCard
          {...baseProps}
          spot={createSpot({ nearestStation })}
          nextSpot={prevSpot}
          onSettingChange={onSettingChange}
        />
      </TooltipProvider>,
    );

    // 1件目: scheduledDepartureTime を更新
    const timeInput = screen.getByTestId('scheduled-departure-1');
    await user.type(timeInput, '08:30');

    // 2件目: transitMemo を更新しても scheduledDepartureTime が元の値から引き継がれる
    const memoTextarea = screen.getByPlaceholderText('例: ○○線 △△行き、乗り換え1回');
    await user.type(memoTextarea, '山手線 渋谷行き');

    const memoCall = onSettingChange.mock.calls.at(-1)?.[0];
    // nearestStation.scheduledDepartureTime は元の prop 値から変わらない（独立した更新）
    expect(memoCall.nearestStation).toMatchObject({ scheduledDepartureTime: '09:00' });
    expect(memoCall.nearestStation).toMatchObject({ memo: '山手線 渋谷行き' });
  });

  // SPEC: PC-PSC-002
  it('移動時間を入力するとストア値が更新される', async () => {
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
        transitTime: 0,
      },
    });

    render(
      <TooltipProvider>
        <PlanSpotSettingCard
          {...baseProps}
          spot={createSpot({ nearestStation })}
          nextSpot={prevSpot}
          onSettingChange={onSettingChange}
        />
      </TooltipProvider>,
    );

    const transitTimeInput = screen.getByTestId('transit-time-test');
    fireEvent.change(transitTimeInput, { target: { value: 45 } });

    const latestCall = onSettingChange.mock.calls.at(-1)?.[0];
    expect(latestCall.nearestStation).toMatchObject({ transitTime: 45 });
  });
});
