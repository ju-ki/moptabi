import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import SpotDetailCard from '@/components/travel-plan/SpotDetailCard';
import { Spot, TransportNodeType } from '@/types/plan';
import { DEFAULT_ARRIVAL_TIME, DEFAULT_DEPARTURE_TIME } from '@/data/constants';

const mockSwitchAlternativeRoute = vi.fn();
const mockGetPlanningResult = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: () => ({
    getPlanningResult: mockGetPlanningResult,
    switchAlternativeRoute: mockSwitchAlternativeRoute,
  }),
}));

/**
 * SpotDetailCard コンポーネントテスト
 *
 * 画面設計書の要件に基づき、以下の機能をテストします：
 * - 各スポットの名称
 * - 各スポットの滞在時間
 * - 各スポットのイメージ画像
 * - 評価
 * - カテゴリ(3つまで)
 * - 各スポットの説明
 * - 各スポットの外部URL
 * - 各スポットの営業時間
 * - 各スポットのメモ機能
 * - 各スポットの住所
 * - 各スポットの間の移動時間と交通手段表示
 * - 各スポットの個別削除機能
 */

// テスト用のスポットデータ
const createMockSpot = (overrides?: Partial<Spot>): Spot => ({
  id: 'spot-1',
  location: {
    id: 'loc-1',
    name: '東京タワー',
    lat: 35.6586,
    lng: 139.7454,
  },
  stayStart: '10:00',
  stayEnd: '12:00',
  stayDuration: 120,
  transports: {
    transportMethod: 4, // TRANSITのid
    name: 'TRANSIT',
    cost: 500,
    travelTime: '30分',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  url: 'https://www.tokyotower.co.jp/',
  memo: 'テストメモ',
  image: '/test-image.jpg',
  rating: 4.5,
  category: ['tourist_attraction', 'historical_place', 'landmark'],
  catchphrase: '東京のシンボル',
  description: '東京のランドマーク的存在のタワー',
  prefecture: '東京都',
  address: '東京都港区芝公園4-2-8',
  ratingCount: 1234,
  regularOpeningHours: [
    { day: '月曜日', hours: '9:00〜23:00' },
    { day: '火曜日', hours: '9:00〜23:00' },
    { day: '水曜日', hours: '9:00〜23:00' },
    { day: '木曜日', hours: '9:00〜23:00' },
    { day: '金曜日', hours: '9:00〜23:00' },
    { day: '土曜日', hours: '9:00〜23:00' },
    { day: '日曜日', hours: '9:00〜23:00' },
  ],
  nearestStation: {
    placeId: 'station-1',
    stationType: 'TRAIN',
    name: '神谷町駅',
    walkingTime: 7,
    latitude: 35.6619,
    longitude: 139.7467,
    transitTime: 12, // 電車/バス移動時間
    scheduledDepartureTime: '11:00',
  },
  order: 1,
  ...overrides,
});

const createMockNextSpot = (overrides?: Partial<Spot>): Spot => ({
  id: 'spot-2',
  location: {
    id: 'loc-2',
    name: '浅草寺',
    lat: 35.7148,
    lng: 139.7967,
  },
  stayStart: '13:00',
  stayEnd: '14:00',
  stayDuration: 60,
  transports: {
    transportMethod: 1,
    name: 'WALKING',
    cost: 0,
    travelTime: '15分',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  nearestStation: {
    placeId: 'station-2',
    stationType: 'TRAIN',
    name: '浅草駅',
    walkingTime: 5,
    latitude: 35.7119,
    longitude: 139.7986,
    transitTime: 8,
    scheduledDepartureTime: '11:20',
  },
  order: 2,
  ...overrides,
});

describe('SpotDetailCard', () => {
  const date = '2026-05-06';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlanningResult.mockReturnValue({
      routes: [
        {
          id: 'route-info-0',
          fromSpotId: 'spot-1',
          toSpotId: 'spot-2',
          fromType: 'SPOT',
          toType: 'SPOT',
          transportMethod: 'TRANSIT',
          transportMethodId: 4,
        },
      ],
      totalDistance: 1000,
      totalDuration: 20,
      departureTime: DEFAULT_DEPARTURE_TIME,
      arrivalTime: DEFAULT_ARRIVAL_TIME,
      isOverTime: false,
      updatedSpots: [
        {
          routeToNext: {
            scheduledDepartureTime: '11:00',
          },
        },
      ],
      updatedDeparture: undefined, // スポットのテストなので仮置き
      updatedDestination: undefined, // スポットのテストなので仮置き
    });
  });

  describe('スポット名称の表示', () => {
    it('スポット名が正しく表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText('東京タワー')).toBeInTheDocument();
    });

    it('番号付きインデックスが表示される', () => {
      const spot = createMockSpot({ order: 3 });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={2}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('滞在時間の表示', () => {
    it('滞在開始時間と終了時間が表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
    });
  });

  describe('イメージ画像の表示', () => {
    it('画像が設定されている場合、画像が表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      const image = screen.getByAltText('東京タワー');
      expect(image).toBeInTheDocument();
    });

    it('画像が設定されていない場合、画像は表示されない', () => {
      const spot = createMockSpot({ image: undefined });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.queryByAltText('東京タワー')).not.toBeInTheDocument();
    });
  });

  describe('評価の表示', () => {
    it('評価が正しく表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('評価がない場合は表示されない', () => {
      const spot = createMockSpot({ rating: undefined });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.queryByTestId('spot-rating')).not.toBeInTheDocument();
    });
  });

  describe('カテゴリの表示', () => {
    it('カテゴリが3つまで表示される', () => {
      const spot = createMockSpot({
        category: ['tourist_attraction', 'historical_place', 'landmark', 'extra_category'],
      });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      // 3つまで表示される
      const categoryContainer = screen.getByTestId('spot-categories');
      expect(categoryContainer.children.length).toBeLessThanOrEqual(3);
    });

    it('カテゴリがない場合は表示されない', () => {
      const spot = createMockSpot({ category: undefined });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.queryByTestId('spot-categories')).not.toBeInTheDocument();
    });
  });

  describe('説明の表示', () => {
    it('キャッチコピーが表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText('東京のシンボル')).toBeInTheDocument();
    });

    it('説明文が表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText('東京のランドマーク的存在のタワー')).toBeInTheDocument();
    });
  });

  describe('外部URLの表示', () => {
    it('外部URLリンクが表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      const link = screen.getByRole('link', { name: /外部サイト/i });
      expect(link).toHaveAttribute('href', 'https://www.tokyotower.co.jp/');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('URLがない場合はリンクが表示されない', () => {
      const spot = createMockSpot({ url: undefined });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.queryByRole('link', { name: /外部サイト/i })).not.toBeInTheDocument();
    });
  });

  describe('営業時間の表示', () => {
    it('営業時間が表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByTestId('spot-opening-hours')).toBeInTheDocument();
    });

    it('営業時間がない場合は表示されない', () => {
      const spot = createMockSpot({ regularOpeningHours: undefined });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.queryByTestId('spot-opening-hours')).not.toBeInTheDocument();
    });
  });

  describe('住所の表示', () => {
    it('住所が表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText('東京都港区芝公園4-2-8')).toBeInTheDocument();
    });

    it('住所がない場合は表示されない', () => {
      const spot = createMockSpot({ address: undefined });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.queryByTestId('spot-address')).not.toBeInTheDocument();
    });
  });

  describe('メモ機能', () => {
    it('メモテキストエリアが表示される', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      const textarea = screen.getByPlaceholderText(/メモや注意点を記載/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('テストメモ');
    });

    it('メモを入力するとonMemoChangeが呼ばれる', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();
      const onMemoChange = vi.fn();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={onMemoChange}
        />,
      );

      const textarea = screen.getByPlaceholderText(/メモや注意点を記載/i);
      fireEvent.change(textarea, { target: { value: '新しいメモ' } });

      expect(onMemoChange).toHaveBeenCalledWith('新しいメモ');
    });
  });

  describe('移動情報の表示', () => {
    it('移動時間と交通手段が表示される', () => {
      const spot = createMockSpot();
      const newSpot = createMockSpot({
        ...spot,
        nearestStation: undefined,
      }); // 最寄駅がない状態にする
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={newSpot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText(/30分/)).toBeInTheDocument();
      // transportIcons.TRANSIT.label = '最寄駅/バス停経由' で表示される
      expect(screen.getByText(/最寄駅|バス停経由/)).toBeInTheDocument();
    });

    describe('削除機能', () => {
      it('削除ボタンをクリックするとonDeleteが呼ばれる', () => {
        const spot = createMockSpot();
        const nextSpot = createMockNextSpot();
        const onDelete = vi.fn();
        render(
          <SpotDetailCard
            date={date}
            spot={spot}
            nextSpot={nextSpot}
            index={0}
            onDelete={onDelete}
            onMemoChange={vi.fn()}
          />,
        );

        const deleteButton = screen.getByRole('button', { name: /削除/i });
        fireEvent.click(deleteButton);

        expect(onDelete).toHaveBeenCalledWith('spot-1');
      });
    });

    it('移動手段候補が表示される', () => {
      const spot = createMockSpot({
        alternateRoutes: [
          {
            transportMethodId: 3,
            transportMethod: 'DRIVING',
            duration: 1500,
            distance: 4200,
            durationText: '25分',
            distanceText: '4.2km',
          },
          {
            transportMethodId: 2,
            transportMethod: 'BICYCLING',
            duration: 2400,
            distance: 4100,
            durationText: '40分',
            distanceText: '4.1km',
          },
        ],
      });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /自転車 \(40分\)/ })).toBeInTheDocument();
    });

    it('活性の移動手段候補を押すとswitchAlternativeRouteが呼ばれる', () => {
      const spot = createMockSpot({
        alternateRoutes: [
          {
            transportMethodId: 3,
            transportMethod: 'DRIVING',
            duration: 1500,
            distance: 4200,
            durationText: '25分',
            distanceText: '4.2km',
          },
        ],
      });
      const nextSpot = createMockNextSpot();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /車 \(25分\)/ }));
      expect(mockSwitchAlternativeRoute).toHaveBeenCalledWith(date, 'route-info-0', 3);
    });

    it('最寄駅がある場合は徒歩→電車→徒歩の区間分割表示になる', () => {
      const spot = createMockSpot();
      const nextSpot = createMockNextSpot();

      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      const breakdown = screen.getByTestId('spot-station-breakdown');
      // SpotDetailCardの現仕様に合わせて文言を検証
      expect(breakdown).toHaveTextContent('徒歩 7分');
      expect(breakdown).toHaveTextContent('神谷町駅');
      expect(breakdown).toHaveTextContent('電車/バス 8分');
      expect(breakdown).toHaveTextContent('発車: 11:00');
      expect(breakdown).toHaveTextContent('浅草駅');
      expect(breakdown).toHaveTextContent('徒歩 5分');
    });

    it('発車時間候補を押すとストアの使用発車時間が更新される', () => {
      const spot = createMockSpot({ routeToNext: { scheduledDepartureTime: '11:05' } as Spot['routeToNext'] });
      const nextSpot = createMockNextSpot();
      const onDepartureTimeChange = vi.fn();
      render(
        <SpotDetailCard
          date={date}
          spot={spot}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
          departureTimeCandidates={['11:05', '11:12', '11:20']}
          selectedDepartureTime="11:05"
          onDepartureTimeChange={onDepartureTimeChange}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: '11:12' }));

      expect(onDepartureTimeChange).toHaveBeenCalledWith('11:12');
      expect(screen.getByTestId('departure-selected-time')).toHaveTextContent('11:12');
    });
  });

  describe('複数日対応', () => {
    it('日付Aと日付Bで異なるスポット情報が表示される', () => {
      const spotA = createMockSpot({
        id: 'spot-a',
        location: { id: 'spot-a', name: '東京タワー', lat: 35.6895, lng: 139.6917 },
      });
      const spotB = createMockSpot({
        id: 'spot-b',
        location: { id: 'spot-b', name: '浅草寺', lat: 35.7148, lng: 139.7967 },
      });
      const nextSpot = createMockNextSpot();

      const { rerender } = render(
        <SpotDetailCard
          date="2025-12-20"
          spot={spotA}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText(/東京タワー/)).toBeInTheDocument();

      // 日付Bに切り替え
      rerender(
        <SpotDetailCard
          date="2025-12-21"
          spot={spotB}
          nextSpot={nextSpot}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      expect(screen.getByText(/浅草寺/)).toBeInTheDocument();
    });

    it('複数日で異なるスポット個数が表示される場合に正しくレンダリングされる', () => {
      const spotDay1 = createMockSpot({
        id: 'spot-1',
        location: { id: 'spot-1', name: '東京タワー', lat: 35.6895, lng: 139.6917 },
      });
      const spotDay2 = createMockSpot({
        id: 'spot-2',
        location: { id: 'spot-2', name: '浅草寺', lat: 35.7148, lng: 139.7967 },
      });

      // 1日目
      const { unmount } = render(
        <SpotDetailCard
          date="2025-12-20"
          spot={spotDay1}
          nextSpot={createMockNextSpot()}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      // 1日目：東京タワーが表示される
      expect(screen.getByText(/東京タワー/)).toBeInTheDocument();

      // 2日目に切り替え
      unmount();
      render(
        <SpotDetailCard
          date="2025-12-21"
          spot={spotDay2}
          nextSpot={createMockNextSpot()}
          index={1}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      // 2日目：浅草寺が表示される
      expect(screen.getByText(/浅草寺/)).toBeInTheDocument();
    });

    it('複数日で異なる最寄駅設定が表示される', () => {
      const spotWithStation = createMockSpot({
        nearestStation: {
          placeId: 'st-1',
          stationType: 'TRAIN',
          name: '赤羽橋駅',
          walkingTime: 7,
          latitude: 35.655,
          longitude: 139.745,
        },
      });

      const spotWithoutStation = createMockSpot({
        nearestStation: undefined,
      });

      // 1日目：最寄駅設定あり
      render(
        <SpotDetailCard
          date="2025-12-20"
          spot={spotWithStation}
          nextSpot={createMockNextSpot()}
          index={0}
          onDelete={vi.fn()}
          onMemoChange={vi.fn()}
        />,
      );

      // 赤羽橋駅がスポットの最寄駅として表示される
      const stationTexts = screen.getAllByText(/赤羽橋駅/);
      expect(stationTexts.length).toBeGreaterThan(0);
    });
  });
});
