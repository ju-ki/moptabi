/**
 * SpotInfoCardコンポーネントのテスト
 *
 * 画面設計書に基づく要件:
 * - 各スポットの名称
 * - 各スポットの滞在時間
 * - 各スポットのイメージ画像(仮画像)
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

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { SpotInfoCard } from '@/components/SpotInfoCard';
import { Spot, TransportNodeType } from '@/types/plan';

// テスト用のモックデータ
const createMockSpot = (overrides: Partial<Spot> = {}): Spot => ({
  id: 'spot-1',
  location: {
    id: 'loc-1',
    lat: 35.6812,
    lng: 139.7671,
    name: '東京タワー',
  },
  stayStart: '10:00',
  stayEnd: '12:00',
  transports: {
    transportMethodIds: [1],
    name: 'TRANSIT',
    cost: 500,
    travelTime: '00:30',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  memo: 'テストメモ',
  image: '/test-image.jpg',
  rating: 4.5,
  ratingCount: 1234,
  category: ['tourist_attraction', 'historical_place', 'landmark'],
  catchphrase: '東京のシンボル',
  description: '東京のランドマーク的存在のタワー',
  prefecture: '東京都',
  address: '東京都港区芝公園4-2-8',
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
    name: '赤羽橋駅',
    walkingTime: 5,
    latitude: 35.6565,
    longitude: 139.7485,
  },
  url: 'https://www.tokyotower.co.jp/',
  order: 1,
  ...overrides,
});

const createDepartureSpot = (): Spot => ({
  id: 'departure-1',
  location: {
    id: 'dep-loc-1',
    lat: 35.6812,
    lng: 139.7671,
    name: '東京駅',
  },
  stayStart: '09:00',
  stayEnd: '09:00',
  transports: {
    transportMethodIds: [1],
    name: 'TRANSIT',
    cost: 0,
    travelTime: '00:30',
    fromType: TransportNodeType.DEPARTURE,
    toType: TransportNodeType.SPOT,
  },
  memo: '出発地のメモ',
  order: 0,
});

const createDestinationSpot = (): Spot => ({
  id: 'destination-1',
  location: {
    id: 'dest-loc-1',
    lat: 35.6895,
    lng: 139.6917,
    name: '新宿駅',
  },
  stayStart: '18:00',
  stayEnd: '18:00',
  transports: {
    transportMethodIds: [1],
    name: 'TRANSIT',
    cost: 0,
    travelTime: '00:00',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.DESTINATION,
  },
  memo: '目的地のメモ',
  order: 99,
});

describe('SpotInfoCard', () => {
  describe('出発地の表示', () => {
    it('出発地の名称が表示される', () => {
      const spot = createDepartureSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('東京駅')).toBeInTheDocument();
    });

    it('出発地のメモが表示される', () => {
      const spot = createDepartureSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('出発地のメモ')).toBeInTheDocument();
    });

    it('メモがない場合はデフォルトテキストが表示される', () => {
      const spot = createDepartureSpot();
      spot.memo = undefined;
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('ここにメモが表示されます')).toBeInTheDocument();
    });

    it('出発ラベルが表示される', () => {
      const spot = createDepartureSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('出発')).toBeInTheDocument();
    });

    it('次のスポットへの移動時間が表示される', () => {
      const spot = createDepartureSpot();
      spot.transports.travelTime = '30 mins';
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('30分')).toBeInTheDocument();
    });
  });

  describe('目的地の表示', () => {
    it('目的地の名称が表示される', () => {
      const spot = createDestinationSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('新宿駅')).toBeInTheDocument();
    });

    it('目的地のメモが表示される', () => {
      const spot = createDestinationSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('目的地のメモ')).toBeInTheDocument();
    });

    it('到着ラベルが表示される', () => {
      const spot = createDestinationSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('到着')).toBeInTheDocument();
    });
  });

  describe('通常スポットの基本情報表示', () => {
    it('スポット名が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('東京タワー')).toBeInTheDocument();
    });

    it('滞在時間が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      // stayStartとstayEndが表示される
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
    });

    it('イメージ画像が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      const image = screen.getByRole('img', { name: '東京タワー' });
      expect(image).toBeInTheDocument();
    });

    it('画像がない場合はデフォルト画像が表示される', () => {
      const spot = createMockSpot({ image: undefined });
      render(<SpotInfoCard spot={spot} />);

      const image = screen.getByRole('img', { name: '東京タワー' });
      expect(image).toHaveAttribute('src', expect.stringContaining('scene.webp'));
    });
  });

  describe('評価の表示', () => {
    it('評価が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('評価がない場合は「-」が表示される', () => {
      const spot = createMockSpot({ rating: undefined });
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('評価件数が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText(/1234/)).toBeInTheDocument();
    });
  });

  describe('カテゴリの表示', () => {
    it('カテゴリが最大3つまで表示される', () => {
      const spot = createMockSpot({
        category: ['tourist_attraction', 'historical_place', 'landmark', 'park'],
      });
      render(<SpotInfoCard spot={spot} />);

      // 最初の3つのカテゴリのみ表示される（placeTypeMapに基づく日本語表示）
      expect(screen.getByText('観光地')).toBeInTheDocument();
      expect(screen.getByText('史跡')).toBeInTheDocument();
      expect(screen.getByText('ランドマーク')).toBeInTheDocument();
    });

    it('カテゴリがない場合は表示されない', () => {
      const spot = createMockSpot({ category: undefined });
      render(<SpotInfoCard spot={spot} />);

      expect(screen.queryByTestId('spot-categories')).not.toBeInTheDocument();
    });
  });

  describe('説明の表示', () => {
    it('キャッチフレーズが表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('東京のシンボル')).toBeInTheDocument();
    });

    it('説明文が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('東京のランドマーク的存在のタワー')).toBeInTheDocument();
    });
  });

  describe('外部URLの表示', () => {
    it('外部URLリンクが表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      const link = screen.getByRole('link', { name: /外部サイト/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://www.tokyotower.co.jp/');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('外部URLがない場合はリンクが表示されない', () => {
      const spot = createMockSpot({ url: undefined });
      render(<SpotInfoCard spot={spot} />);

      expect(screen.queryByRole('link', { name: /外部サイト/ })).not.toBeInTheDocument();
    });
  });

  describe('営業時間の表示', () => {
    it('営業時間セクションが表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('営業時間')).toBeInTheDocument();
    });

    it('アコーディオンを開くと営業時間の詳細が表示される', async () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      // アコーディオンを開く
      const trigger = screen.getByText('営業時間');
      fireEvent.click(trigger);

      // 営業時間の詳細が表示される
      expect(await screen.findByText(/月曜日: 9:00〜23:00/)).toBeInTheDocument();
    });

    it('営業時間がない場合は表示されない', () => {
      const spot = createMockSpot({ regularOpeningHours: undefined });
      render(<SpotInfoCard spot={spot} />);

      expect(screen.queryByTestId('spot-opening-hours')).not.toBeInTheDocument();
    });
  });

  describe('住所の表示', () => {
    it('住所が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText(/東京都港区芝公園4-2-8/)).toBeInTheDocument();
    });

    it('住所がない場合は表示されない', () => {
      const spot = createMockSpot({ address: undefined });
      render(<SpotInfoCard spot={spot} />);

      expect(screen.queryByTestId('spot-address')).not.toBeInTheDocument();
    });
  });

  describe('メモ機能', () => {
    it('メモが表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('テストメモ')).toBeInTheDocument();
    });
  });

  describe('移動時間と交通手段の表示', () => {
    it('次のスポットへの移動時間が表示される', () => {
      const spot = createMockSpot({
        transports: {
          transportMethodIds: [1],
          name: 'TRANSIT',
          cost: 500,
          travelTime: '30 mins',
          fromType: TransportNodeType.SPOT,
          toType: TransportNodeType.SPOT,
        },
      });
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText('30分')).toBeInTheDocument();
    });

    it('移動時間が0の場合も適切に表示される', () => {
      const spot = createMockSpot({
        transports: {
          transportMethodIds: [1],
          name: 'WALKING',
          cost: 0,
          travelTime: '0 mins',
          fromType: TransportNodeType.SPOT,
          toType: TransportNodeType.SPOT,
        },
      });
      render(<SpotInfoCard spot={spot} />);

      // 0分の表示を確認
      expect(screen.getByText('0分')).toBeInTheDocument();
    });
  });

  describe('最寄駅情報の表示', () => {
    it('最寄駅情報が表示される', () => {
      const spot = createMockSpot();
      render(<SpotInfoCard spot={spot} />);

      expect(screen.getByText(/徒歩5分/)).toBeInTheDocument();
    });

    it('最寄駅情報がない場合は表示されない', () => {
      const spot = createMockSpot({ nearestStation: undefined });
      render(<SpotInfoCard spot={spot} />);

      expect(screen.queryByTestId('spot-nearest-station')).not.toBeInTheDocument();
    });
  });
});
